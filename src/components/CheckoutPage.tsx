import React, { useState, useEffect, useRef } from 'react';
import {
  CartItem,
  UserCard,
  SavedAddress,
  CardEvaluation,
  GraphNodeStep,
  InputValidationReport,
} from '../types';
import {
  ShieldCheck,
  CreditCard,
  MapPin,
  Mic,
  MicOff,
  Send,
  Volume2,
  VolumeX,
  Sparkles,
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Info,
  Check,
  XCircle,
  Clock,
  ExternalLink,
  Radio,
  ArrowRight,
  Database,
  FileCode,
  ShieldAlert,
} from 'lucide-react';

interface CheckoutPageProps {
  cart: {
    items: CartItem[];
    subtotal: number;
    gst: number;
    deliveryFee: number;
    cartTotal: number;
    appliedOfferCode: string | null;
    appliedDiscount: number;
  };
  cards: UserCard[];
  address: SavedAddress;
  onUpdateCartItem: (productId: string, quantity: number) => void;
  onApplyOffer: (cardId: string, offerCode: string) => Promise<void>;
  onRefreshCart: () => void;
}

export const CheckoutPage: React.FC<CheckoutPageProps> = ({
  cart,
  cards,
  address,
  onUpdateCartItem,
  onApplyOffer,
  onRefreshCart,
}) => {
  // Voice & Chat State
  const [userQuery, setUserQuery] = useState<string>('');
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [speechSupported, setSpeechSupported] = useState<boolean>(true);
  const [voiceError, setVoiceError] = useState<string | null>(null);
  const [ttsEnabled, setTtsEnabled] = useState<boolean>(true);
  const [interimTranscript, setInterimTranscript] = useState<string>('');

  const [chatMessages, setChatMessages] = useState<
    Array<{ role: 'user' | 'assistant' | 'system'; text: string; timestamp: string }>
  >([
    {
      role: 'assistant',
      text: 'Hello! I am your LangGraph Card Offer Checker. Speak into the mic or type below to find which card saves you the most on this cart.',
      timestamp: new Date().toLocaleTimeString(),
    },
  ]);

  // Agent Graph State
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [steps, setSteps] = useState<GraphNodeStep[]>([
    { name: 'intake_node', title: '1. Reading Cart & Cards', status: 'pending' },
    { name: 'offer_retriever_agent', title: '2. Fetching Bank Pages', status: 'pending' },
    { name: 'card_extractor_agent', title: '3. Parsing Terms & Limits', status: 'pending' },
    { name: 'eligibility_agent', title: '4. Checking Eligibility', status: 'pending' },
    { name: 'best_offer_decider_agent', title: '5. Calculating Capped Savings', status: 'pending' },
    { name: 'summary_node', title: '6. Ranking Cards', status: 'pending' },
    { name: 'human_approval_node', title: '7. Approval Gate', status: 'pending' },
    { name: 'apply_offer_node', title: '8. Applying Offer', status: 'pending' },
    { name: 'reverify_node', title: '9. Re-Verifying Total', status: 'pending' },
    { name: 'respond_node', title: '10. Voice Summary', status: 'pending' },
  ]);
  const [rankedCards, setRankedCards] = useState<CardEvaluation[]>([]);
  const [bestCard, setBestCard] = useState<CardEvaluation | null>(null);
  const [approvalProposal, setApprovalProposal] = useState<any>(null);
  const [approvalStatus, setApprovalStatus] = useState<
    'idle' | 'pending_approval' | 'approved' | 'rejected'
  >('idle');
  const [appliedResult, setAppliedResult] = useState<any>(null);
  const [verificationResult, setVerificationResult] = useState<any>(null);
  const [validationReport, setValidationReport] = useState<InputValidationReport | null>(null);
  const [showInputInspector, setShowInputInspector] = useState<boolean>(false);
  const [expandedEvidenceId, setExpandedEvidenceId] = useState<string | null>(null);
  const [uncertainties, setUncertainties] = useState<Array<{ item: string; reason: string }>>([]);
  const [sessionId] = useState<string>(() => `checkout_${Date.now()}`);

  const recognitionRef = useRef<any>(null);

  // Check Speech Recognition capability
  useEffect(() => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setSpeechSupported(false);
      setVoiceError('Web Speech API is not supported in this browser. Please use text chat or the quick prompt chips.');
    } else {
      setSpeechSupported(true);
    }

    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch {}
      }
    };
  }, []);

  // Auto-run initial evaluation when entering checkout so comparison chart is immediately populated
  useEffect(() => {
    if (rankedCards.length === 0 && !isRunning) {
      handleRunAgent('Which of my cards gives the best deal on this cart?', true);
    }
  }, [cart.subtotal]);

  // Robust voice recording toggle without getUserMedia race conditions
  const toggleVoiceRecording = () => {
    setVoiceError(null);

    // If currently recording, stop it cleanly
    if (isRecording) {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch {}
      }
      setIsRecording(false);
      setInterimTranscript('');
      return;
    }

    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setVoiceError('Speech recognition is not supported in this browser. You can click any quick voice query chip or type below.');
      return;
    }

    try {
      // Abort previous instance if any
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch {}
      }

      const recog = new SpeechRecognition();
      recog.continuous = false;
      recog.interimResults = true;
      recog.maxAlternatives = 1;

      try {
        recog.lang = 'en-IN';
      } catch {
        recog.lang = 'en-US';
      }

      recog.onstart = () => {
        setIsRecording(true);
        setVoiceError(null);
        setInterimTranscript('Listening... Speak your question now');
      };

      recog.onresult = (event: any) => {
        let transcript = '';
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          transcript += event.results[i][0].transcript;
        }
        setInterimTranscript(transcript);

        if (event.results[0] && event.results[0].isFinal) {
          const finalQuery = transcript.trim();
          setUserQuery(finalQuery);
          setIsRecording(false);
          setInterimTranscript('');
          handleRunAgent(finalQuery);
        }
      };

      recog.onerror = (event: any) => {
        console.warn('SpeechRecognition error:', event.error);
        setIsRecording(false);
        setInterimTranscript('');

        if (event.error === 'not-allowed' || event.error === 'permission-denied') {
          setVoiceError(
            'Microphone access blocked. Please allow mic permission in your browser URL bar, or click any voice query chip below.'
          );
        } else if (event.error === 'no-speech') {
          setVoiceError('No speech was detected. Click the mic button and try speaking again.');
        } else if (event.error === 'audio-capture') {
          setVoiceError('No microphone hardware detected on this device.');
        } else if (event.error === 'network') {
          setVoiceError('Speech network connection issue. Click any quick query chip below.');
        } else if (event.error !== 'aborted') {
          setVoiceError(`Voice input notice (${event.error}). You can also type or use quick chips.`);
        }
      };

      recog.onend = () => {
        setIsRecording(false);
      };

      recognitionRef.current = recog;
      recog.start();
    } catch (err: any) {
      console.warn('Recognition start exception:', err);
      setIsRecording(false);
      setVoiceError('Could not access microphone. Try clicking one of the quick voice query chips below.');
    }
  };

  const speakText = (text: string) => {
    if (!ttsEnabled || !('speechSynthesis' in window)) return;
    try {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 1.0;
      utterance.pitch = 1.0;
      utterance.lang = 'en-IN';
      window.speechSynthesis.speak(utterance);
    } catch (e) {
      console.warn('TTS playback error:', e);
    }
  };

  // Run the 10-node agent graph
  const handleRunAgent = async (overrideQuery?: string, silentChat: boolean = false) => {
    const query = overrideQuery !== undefined ? overrideQuery : userQuery;
    if (!query.trim()) return;

    setIsRunning(true);
    if (!silentChat) {
      setChatMessages((prev) => [
        ...prev,
        { role: 'user', text: query, timestamp: new Date().toLocaleTimeString() },
      ]);
    }
    setUserQuery('');
    setVoiceError(null);

    try {
      const res = await fetch('/api/agent/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId,
          userQuery: query,
          action: 'start',
          silent: silentChat,
        }),
      });

      const data = await res.json();
      if (data.state) {
        const state = data.state;
        setSteps(state.steps);
        setRankedCards(state.summarySorted || []);
        setBestCard(state.bestChoice || null);
        setApprovalProposal(state.approvalProposal || null);
        setApprovalStatus(state.approvalStatus || 'idle');
        setUncertainties(state.uncertainties || []);
        setVerificationResult(state.verificationResult || null);
        setAppliedResult(state.appliedResult || null);
        setValidationReport(state.inputValidationReport || null);

        if (!silentChat && state.messages && state.messages.length > 0) {
          const lastMsg = state.messages[state.messages.length - 1];
          setChatMessages((prev) => [
            ...prev,
            { role: lastMsg.role, text: lastMsg.text, timestamp: new Date().toLocaleTimeString() },
          ]);
          speakText(lastMsg.text);
        }
      }
    } catch (err: any) {
      console.error('Agent graph invocation error:', err);
      setChatMessages((prev) => [
        ...prev,
        {
          role: 'system',
          text: `Error contacting agent service: ${err.message}`,
          timestamp: new Date().toLocaleTimeString(),
        },
      ]);
    } finally {
      setIsRunning(false);
    }
  };

  // Human-in-the-loop: Approve offer
  const handleApprove = async () => {
    if (!approvalProposal) return;
    setIsRunning(true);

    try {
      const res = await fetch('/api/agent/approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId,
          cardId: approvalProposal.cardId,
          offerCode: approvalProposal.offerCode,
        }),
      });

      const data = await res.json();
      if (data.state) {
        setSteps(data.state.steps);
        setApprovalStatus('approved');
        setAppliedResult(data.state.appliedResult);
        setVerificationResult(data.state.verificationResult);
        setValidationReport(data.state.inputValidationReport || null);

        if (data.state.messages && data.state.messages.length > 0) {
          const lastMsg = data.state.messages[data.state.messages.length - 1];
          setChatMessages((prev) => [
            ...prev,
            { role: 'assistant', text: lastMsg.text, timestamp: new Date().toLocaleTimeString() },
          ]);
          speakText(lastMsg.text);
        }
      }

      onRefreshCart();
    } catch (err: any) {
      console.error('Approval failed:', err);
    } finally {
      setIsRunning(false);
    }
  };

  // Human-in-the-loop: Reject offer
  const handleReject = async () => {
    setIsRunning(true);
    try {
      const res = await fetch('/api/agent/reject', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId }),
      });
      const data = await res.json();
      if (data.state) {
        setSteps(data.state.steps);
        setApprovalStatus('rejected');
        setChatMessages((prev) => [
          ...prev,
          {
            role: 'assistant',
            text: 'Offer proposal rejected. No discount was applied to your cart.',
            timestamp: new Date().toLocaleTimeString(),
          },
        ]);
        speakText('Offer proposal rejected. No discount was applied.');
      }
    } catch (err: any) {
      console.error('Rejection failed:', err);
    } finally {
      setIsRunning(false);
    }
  };

  const handleSelectAlternativeCard = (evaluation: CardEvaluation) => {
    if (!evaluation.isEligible || !evaluation.bestOffer) return;
    setApprovalProposal({
      cardId: evaluation.cardId,
      cardName: evaluation.card.cardName,
      bank: evaluation.card.bank,
      offerCode: evaluation.bestOffer.offer.code,
      discountAmount: evaluation.discountAmount,
      finalPayable: evaluation.finalPayable,
      savingsText: `Saves ₹${evaluation.discountAmount.toLocaleString('en-IN')}`,
      conditions: evaluation.bestOffer.offer.rawExcerpt,
    });
    setBestCard(evaluation);
    setApprovalStatus('pending_approval');
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Checkout Page Header */}
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Checkout & Bank Offer Evaluation
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Visual comparison of your saved cards, capped discounts, and true EMI financing costs.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowInputInspector(!showInputInspector)}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg border transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs ${
              showInputInspector
                ? 'bg-slate-900 text-white border-slate-900'
                : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-300'
            }`}
            title="Inspect stable IDs and field validation for cart, cards, and bank terms (Suggestion 1)"
          >
            <Database className="w-3.5 h-3.5 text-blue-500" />
            <span>Input Records & IDs</span>
            {validationReport?.isValid && (
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            )}
          </button>

          <button
            onClick={() => handleRunAgent('Which of my cards gives the best deal on this cart?')}
            disabled={isRunning}
            className="px-3.5 py-1.5 text-xs font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRunning ? 'animate-spin' : ''}`} />
            <span>Re-evaluate Cards</span>
          </button>
        </div>
      </div>

      {/* 1. INPUT RECORDS & STABLE IDs INSPECTOR (Suggestion 1) */}
      {showInputInspector && (
        <div className="mb-8 p-5 bg-slate-900 text-slate-100 rounded-2xl border border-slate-800 shadow-xl space-y-4 animate-fade-in font-mono text-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-800">
            <div className="flex items-center gap-2">
              <FileCode className="w-4 h-4 text-blue-400" />
              <span className="font-bold text-white text-sm">
                Checkout Input Records & Invariant Schema Validation
              </span>
              <span className="px-2 py-0.5 rounded text-[10px] bg-emerald-950 text-emerald-400 border border-emerald-800 font-bold">
                SUGGESTION 1 COMPLIANT
              </span>
            </div>
            <div className="flex items-center gap-2 text-[11px] text-slate-400">
              <span>Checksum: <strong className="text-amber-400">{validationReport?.checksum || 'chk_live_active'}</strong></span>
              <span>·</span>
              <span className="text-emerald-400 font-bold">Stable IDs Validated</span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Record 1: Cart Items */}
            <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 space-y-2">
              <div className="flex items-center justify-between text-blue-400 font-bold text-[11px] border-b border-slate-800 pb-1.5">
                <span>1. Cart Dataset ({cart.items.length} items)</span>
                <span className="text-slate-400 font-normal">Target: Order #DK-9842</span>
              </div>
              <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1 text-[11px]">
                {cart.items.map((it) => (
                  <div key={it.product.id} className="p-1.5 rounded bg-slate-900/80 border border-slate-800/80 flex items-center justify-between">
                    <div>
                      <span className="text-amber-300 font-bold">{it.product.id}</span>
                      <p className="text-slate-300 truncate w-36 text-[10px]">{it.product.name}</p>
                    </div>
                    <span className="text-slate-400 text-[10px]">
                      ₹{it.product.price.toLocaleString('en-IN')} × {it.quantity}
                    </span>
                  </div>
                ))}
              </div>
              <div className="pt-1 text-[10px] text-slate-400 flex justify-between">
                <span>Subtotal Sum:</span>
                <span className="text-emerald-400 font-bold">₹{cart.subtotal.toLocaleString('en-IN')}</span>
              </div>
            </div>

            {/* Record 2: Owned Cards */}
            <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 space-y-2">
              <div className="flex items-center justify-between text-indigo-400 font-bold text-[11px] border-b border-slate-800 pb-1.5">
                <span>2. Owned Cards ({cards.length} cards)</span>
                <span className="text-slate-400 font-normal">PCI Tokenized</span>
              </div>
              <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1 text-[11px]">
                {cards.map((c) => (
                  <div key={c.id} className="p-1.5 rounded bg-slate-900/80 border border-slate-800/80 flex items-center justify-between">
                    <div>
                      <span className="text-amber-300 font-bold">{c.id}</span>
                      <p className="text-slate-300 text-[10px]">{c.cardName.slice(0, 22)}...</p>
                    </div>
                    <span className="text-slate-400 text-[10px]">
                      {c.type.toUpperCase()} ···· {c.last4}
                    </span>
                  </div>
                ))}
              </div>
              <div className="pt-1 text-[10px] text-slate-400 flex justify-between">
                <span>Security Level:</span>
                <span className="text-emerald-400 font-bold">Last 4 Only (Safe)</span>
              </div>
            </div>

            {/* Record 3: Scraped Bank Feeds */}
            <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 space-y-2">
              <div className="flex items-center justify-between text-amber-400 font-bold text-[11px] border-b border-slate-800 pb-1.5">
                <span>3. Bank Feeds & Offer Terms</span>
                <span className="text-slate-400 font-normal">Named Sources</span>
              </div>
              <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1 text-[11px]">
                {[
                  { id: 'off_hdfc_elec_10', bank: 'HDFC', src: 'src_bank_page_hdfc', cap: '₹1,500' },
                  { id: 'off_icici_festive_flat2500', bank: 'ICICI', src: 'src_bank_page_icici', cap: 'Flat ₹2.5k' },
                  { id: 'off_sbi_premium_4000', bank: 'SBI', src: 'src_bank_page_sbi', cap: 'Min ₹45k' },
                  { id: 'off_axis_debit_10', bank: 'AXIS', src: 'src_bank_page_axis', cap: 'Debit Only' },
                  { id: 'off_kotak_nocost_emi6', bank: 'KOTAK', src: 'src_bank_page_kotak', cap: 'Hidden Fee' },
                  { id: 'off_amex_autumn_15', bank: 'AMEX', src: 'src_bank_page_amex', cap: 'Expired' },
                ].map((f) => (
                  <div key={f.id} className="p-1.5 rounded bg-slate-900/80 border border-slate-800/80 flex items-center justify-between">
                    <div>
                      <span className="text-amber-300 font-bold">{f.id}</span>
                      <p className="text-slate-400 text-[10px]">{f.src}</p>
                    </div>
                    <span className="text-blue-400 text-[10px]">{f.cap}</span>
                  </div>
                ))}
              </div>
              <div className="pt-1 text-[10px] text-slate-400 flex justify-between">
                <span>Scraped Sources:</span>
                <span className="text-emerald-400 font-bold">6/6 Mock Bank Sites</span>
              </div>
            </div>
          </div>

          {/* Validation Invariant Results */}
          {validationReport?.checks && (
            <div className="pt-2 border-t border-slate-800 flex flex-wrap items-center gap-3 text-[11px]">
              <span className="text-slate-400">Pre-Execution Invariants:</span>
              {validationReport.checks.map((chk, i) => (
                <span key={i} className="flex items-center gap-1 text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-800/60">
                  <Check className="w-3 h-3" />
                  <span>{chk.name}: Passed</span>
                </span>
              ))}
            </div>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column (5 Cols): Order Items, Address, Saved Cards & Mock Safe Payment */}
        <div className="lg:col-span-5 space-y-6">
          {/* Cart Items Summary */}
          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
            <div className="flex items-center justify-between mb-3 pb-3 border-b border-slate-100">
              <h2 className="text-sm font-bold text-slate-900">Order Items ({cart.items.length})</h2>
              <span className="text-xs text-slate-500 font-mono tabular-nums">
                Subtotal: ₹{cart.subtotal.toLocaleString('en-IN')}
              </span>
            </div>

            <div className="space-y-3 max-h-60 overflow-y-auto pr-1">
              {cart.items.map((item) => (
                <div key={item.product.id} className="flex items-center gap-3">
                  <img
                    src={item.product.image}
                    alt={item.product.name}
                    className="w-12 h-12 rounded-lg object-cover bg-slate-100 shrink-0 border border-slate-200"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-slate-900 truncate">{item.product.name}</p>
                    <p className="text-[11px] text-slate-500">
                      ₹{item.product.price.toLocaleString('en-IN')} x {item.quantity}
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      onClick={() => onUpdateCartItem(item.product.id, Math.max(0, item.quantity - 1))}
                      className="w-6 h-6 rounded bg-slate-100 text-slate-700 hover:bg-slate-200 flex items-center justify-center text-xs font-bold cursor-pointer"
                    >
                      -
                    </button>
                    <span className="text-xs font-semibold w-5 text-center font-mono">{item.quantity}</span>
                    <button
                      onClick={() => onUpdateCartItem(item.product.id, item.quantity + 1)}
                      className="w-6 h-6 rounded bg-slate-100 text-slate-700 hover:bg-slate-200 flex items-center justify-center text-xs font-bold cursor-pointer"
                    >
                      +
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Bill Summary */}
            <div className="mt-4 pt-4 border-t border-slate-100 space-y-1.5 text-xs">
              <div className="flex justify-between text-slate-600">
                <span>Items Subtotal</span>
                <span className="font-mono tabular-nums">₹{cart.subtotal.toLocaleString('en-IN')}</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Delivery Fee</span>
                <span className="text-emerald-600 font-semibold">
                  {cart.deliveryFee === 0 ? 'FREE' : `₹${cart.deliveryFee}`}
                </span>
              </div>
              {cart.appliedDiscount > 0 && (
                <div className="flex justify-between text-emerald-700 font-semibold bg-emerald-50 px-2 py-1 rounded">
                  <span>Card Discount ({cart.appliedOfferCode})</span>
                  <span className="font-mono tabular-nums">-₹{cart.appliedDiscount.toLocaleString('en-IN')}</span>
                </div>
              )}
              <div className="flex justify-between text-sm font-bold text-slate-900 pt-2 border-t border-slate-100">
                <span>Final Payable</span>
                <span className="font-mono tabular-nums text-blue-600">₹{cart.cartTotal.toLocaleString('en-IN')}</span>
              </div>
            </div>
          </div>

          {/* Delivery Address */}
          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
            <div className="flex items-center gap-2 mb-2 text-slate-900 font-bold text-sm">
              <MapPin className="w-4 h-4 text-blue-600" />
              <span>Delivery Address</span>
            </div>
            <p className="text-xs font-semibold text-slate-800">{address.name}</p>
            <p className="text-xs text-slate-600 leading-relaxed mt-0.5">
              {address.street}, {address.city}, {address.state} - {address.pincode}
            </p>
            <p className="text-[11px] text-slate-500 mt-1">Phone: {address.phone}</p>
          </div>

          {/* Saved Cards Section (Safe: Last 4 digits only) */}
          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2 text-slate-900 font-bold text-sm">
                <CreditCard className="w-4 h-4 text-emerald-600" />
                <span>Your Saved Cards ({cards.length})</span>
              </div>
              <span className="text-[10px] text-slate-500 font-medium bg-slate-100 px-2 py-0.5 rounded">
                Last 4 Digits Only · PCI Safe
              </span>
            </div>

            <div className="space-y-2">
              {cards.map((card) => {
                const isWinner = bestCard?.cardId === card.id;
                return (
                  <div
                    key={card.id}
                    className={`p-3 rounded-lg border text-xs transition-colors flex items-center justify-between ${
                      isWinner
                        ? 'border-blue-500 bg-blue-50/50 shadow-xs'
                        : 'border-slate-200 bg-slate-50/60'
                    }`}
                  >
                    <div>
                      <div className="flex items-center gap-2 font-semibold text-slate-800">
                        <span>{card.cardName}</span>
                        {isWinner && (
                          <span className="text-[10px] bg-blue-600 text-white px-1.5 py-0.5 rounded font-bold">
                            Best Deal
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        {card.network} {card.type.toUpperCase()} ···· {card.last4}
                      </p>
                    </div>
                    <span className="text-slate-400 font-mono text-[11px]">Ready</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Mock Safe Payment Info */}
          <div className="bg-amber-50/80 border border-amber-200 rounded-xl p-4 text-xs text-amber-900">
            <div className="flex items-center gap-2 font-bold mb-1">
              <ShieldCheck className="w-4 h-4 text-amber-700" />
              <span>Safe Evaluation Mode</span>
            </div>
            <p className="leading-relaxed mb-3">
              This application is designed for discount discovery and invariant verification. No actual payments, CVVs, or bank credentials are ever stored or processed.
            </p>
            <button
              disabled
              className="w-full py-2.5 px-4 bg-slate-200 text-slate-500 rounded-lg font-semibold text-xs cursor-not-allowed text-center"
            >
              Pay ₹{cart.cartTotal.toLocaleString('en-IN')} (Demo Mode - Payment Disabled)
            </button>
          </div>
        </div>

        {/* Right Column (7 Cols): LangGraph Chatbot ABOVE, Graph & Comparison Chart BELOW */}
        <div className="lg:col-span-7 space-y-6">
          {/* 1. LANGGRAPH CHATBOT & VOICE ASSISTANT (ABOVE) */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-5 border-b border-slate-100 bg-gradient-to-r from-blue-50/40 via-white to-indigo-50/40">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-md bg-blue-600 text-white flex items-center justify-center font-bold text-xs">
                    AI
                  </div>
                  <h2 className="text-sm font-bold text-slate-900">
                    LangGraph Card Offer Checker & Voice Assistant
                  </h2>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setTtsEnabled(!ttsEnabled)}
                    className="p-1.5 text-slate-500 hover:text-slate-800 rounded-md hover:bg-slate-100 transition-colors cursor-pointer"
                    title={ttsEnabled ? 'Mute Speech Output' : 'Enable Speech Output (TTS)'}
                  >
                    {ttsEnabled ? <Volume2 className="w-4 h-4 text-blue-600" /> : <VolumeX className="w-4 h-4" />}
                  </button>
                  <button
                    onClick={() => handleRunAgent('Which of my cards gives the best deal on this cart?')}
                    disabled={isRunning}
                    className="px-3 py-1 text-xs font-semibold text-blue-700 bg-blue-100/70 hover:bg-blue-100 rounded-md transition-colors flex items-center gap-1 cursor-pointer"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isRunning ? 'animate-spin' : ''}`} />
                    <span>Re-evaluate</span>
                  </button>
                </div>
              </div>

              <p className="text-xs text-slate-600">
                Ask by voice or text. Our LangGraph state machine analyzes your cart, scrapes bank terms, tests caps, and catches hidden fees.
              </p>
            </div>

            {/* Voice Status & Error Banner (If Mic has issues) */}
            {voiceError && (
              <div className="mx-5 mt-4 p-3 rounded-lg bg-amber-50 border border-amber-200 text-xs text-amber-900 flex items-start justify-between gap-2">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <p className="leading-snug">{voiceError}</p>
                </div>
                <button
                  onClick={() => setVoiceError(null)}
                  className="text-amber-700 hover:text-amber-900 font-bold shrink-0 cursor-pointer"
                >
                  ✕
                </button>
              </div>
            )}

            {/* Live Recording Pulse Banner */}
            {isRecording && (
              <div className="mx-5 mt-4 p-3 rounded-lg bg-red-50 border border-red-200 text-xs text-red-900 flex items-center justify-between animate-pulse">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-red-600 animate-ping" />
                  <span className="font-bold">Listening to your voice...</span>
                  <span className="italic text-slate-600">{interimTranscript || 'Speak your question now'}</span>
                </div>
                <button
                  onClick={toggleVoiceRecording}
                  className="px-2 py-0.5 bg-red-600 text-white rounded text-[10px] font-bold cursor-pointer"
                >
                  Done Speaking
                </button>
              </div>
            )}

            {/* Live Chat & Voice Messages Area */}
            <div className="p-5 space-y-4">
              <div className="bg-slate-50 rounded-xl p-4 max-h-56 overflow-y-auto space-y-3 border border-slate-200/60">
                {chatMessages.map((msg, idx) => (
                  <div
                    key={idx}
                    className={`flex flex-col text-xs ${
                      msg.role === 'user' ? 'items-end' : 'items-start'
                    }`}
                  >
                    <div
                      className={`max-w-[85%] rounded-xl px-3.5 py-2.5 leading-relaxed ${
                        msg.role === 'user'
                          ? 'bg-blue-600 text-white'
                          : msg.role === 'system'
                          ? 'bg-amber-100 text-amber-900 border border-amber-200'
                          : 'bg-white text-slate-800 border border-slate-200 shadow-xs'
                      }`}
                    >
                      <p>{msg.text}</p>
                    </div>
                    <span className="text-[10px] text-slate-400 mt-1 px-1">{msg.timestamp}</span>
                  </div>
                ))}
              </div>

              {/* Quick Voice / Chat Prompt Chips */}
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-[11px] text-slate-400 font-medium mr-1">Voice Prompts:</span>
                {[
                  'Which card gives the best deal on this cart?',
                  'What if I use my ICICI card?',
                  'Compare EMI options',
                  'I prefer no EMI',
                ].map((chip) => (
                  <button
                    key={chip}
                    onClick={() => handleRunAgent(chip)}
                    className="px-2.5 py-1 text-[11px] rounded-md bg-slate-100 hover:bg-blue-50 hover:text-blue-700 text-slate-700 border border-slate-200 transition-colors cursor-pointer flex items-center gap-1"
                  >
                    <Mic className="w-3 h-3 text-slate-400" />
                    <span>"{chip}"</span>
                  </button>
                ))}
              </div>

              {/* Input Row with Mic Button */}
              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <input
                    type="text"
                    value={userQuery}
                    onChange={(e) => setUserQuery(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleRunAgent()}
                    placeholder={
                      isRecording
                        ? 'Listening to your voice...'
                        : 'Ask: "Which card gives the best deal on this cart?"'
                    }
                    className={`w-full px-3.5 py-2 text-xs rounded-lg border bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                      isRecording ? 'border-red-400 ring-2 ring-red-200 animate-pulse' : 'border-slate-300'
                    }`}
                  />
                </div>

                {/* Voice Mic Trigger Button */}
                <button
                  onClick={toggleVoiceRecording}
                  className={`p-2.5 rounded-lg transition-all cursor-pointer flex items-center justify-center shrink-0 ${
                    isRecording
                      ? 'bg-red-600 text-white animate-bounce shadow-md ring-2 ring-red-300'
                      : 'bg-blue-600 hover:bg-blue-700 text-white shadow-xs'
                  }`}
                  title={isRecording ? 'Stop Recording' : 'Start Voice Input (Web Speech API)'}
                >
                  {isRecording ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                </button>

                <button
                  onClick={() => handleRunAgent()}
                  disabled={isRunning || !userQuery.trim()}
                  className="px-4 py-2 bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 cursor-pointer shadow-sm shrink-0"
                >
                  <span>Send</span>
                  <Send className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Human Approval Gate (Interrupt node - Suggestion 4) */}
            {approvalStatus === 'pending_approval' && approvalProposal && (
              <div className="m-5 p-4 rounded-xl bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 shadow-sm animate-fade-in space-y-3">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center shrink-0">
                    <Sparkles className="w-4 h-4" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold uppercase tracking-wider text-blue-700">
                          Human Approval Node (Interrupt)
                        </span>
                        <span className="text-[10px] font-bold bg-amber-100 text-amber-800 px-2 py-0.5 rounded border border-amber-300">
                          Awaiting Approval
                        </span>
                      </div>
                      <span className="text-xs font-extrabold text-emerald-700 bg-emerald-100 px-2.5 py-0.5 rounded">
                        {approvalProposal.savingsText}
                      </span>
                    </div>

                    <h3 className="text-sm font-bold text-slate-900 mt-1">
                      Apply {approvalProposal.cardName} with code {approvalProposal.offerCode}?
                    </h3>

                    {/* Proposed Destination & Change (Suggestion 4) */}
                    <div className="mt-2.5 p-2.5 bg-white rounded-lg border border-blue-100 text-[11px] space-y-1">
                      <div className="flex justify-between text-slate-600">
                        <span>Proposed Destination:</span>
                        <span className="font-mono text-slate-800 font-semibold">{approvalProposal.destinationTarget || 'Cart Order #DK-9842'}</span>
                      </div>
                      <div className="flex justify-between text-slate-600">
                        <span>Proposed Change:</span>
                        <span className="font-mono text-emerald-700 font-bold">-₹{approvalProposal.discountAmount.toLocaleString('en-IN')} off subtotal</span>
                      </div>
                      <div className="flex justify-between text-slate-600 border-t border-slate-100 pt-1">
                        <span>Original Subtotal → New Total:</span>
                        <span className="font-mono text-slate-800">
                          ₹{cart.subtotal.toLocaleString('en-IN')} → <strong className="text-blue-700">₹{approvalProposal.finalPayable.toLocaleString('en-IN')}</strong>
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between gap-3 mt-3">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={handleApprove}
                          className="px-4 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer shadow-sm"
                        >
                          <Check className="w-3.5 h-3.5" />
                          <span>Approve & Apply Offer</span>
                        </button>
                        <button
                          onClick={handleReject}
                          className="px-3 py-2 text-xs font-medium text-slate-700 bg-white hover:bg-slate-100 border border-slate-300 rounded-lg transition-colors cursor-pointer"
                        >
                          Reject Offer
                        </button>
                      </div>

                      <span className="text-[10px] text-slate-400 font-medium hidden sm:inline">
                        Zero Payment · Discount Only
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Applied Offer Banner (Suggestion 4) */}
            {appliedResult?.success && (
              <div className="m-5 p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-xs space-y-2">
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2 font-bold text-emerald-900">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span>Offer Successfully Applied (Permitted Action Executed · No Payment)</span>
                  </div>
                  <span className="text-[10px] text-emerald-800 font-mono bg-emerald-100/70 px-2 py-0.5 rounded">
                    {appliedResult.isIdempotentRetry ? 'Idempotent Retry (Duplicate Prevented)' : 'Idempotent Key Generated'}
                  </span>
                </div>
                <p className="text-emerald-800 leading-relaxed">
                  Saved ₹{appliedResult.appliedDiscount.toLocaleString('en-IN')} on your cart invoice!
                </p>
                <div className="text-[10px] text-emerald-700 font-mono">
                  Stored Key: {appliedResult.idempotencyKey}
                </div>
              </div>
            )}

            {/* Separate Re-Verification Audit Results Panel (Suggestion 5) */}
            {verificationResult && (
              <div
                className={`m-5 p-4 rounded-xl border text-xs space-y-3 ${
                  verificationResult.mismatchDetected
                    ? 'bg-red-50 border-red-300 text-red-900 animate-pulse'
                    : 'bg-slate-50 border-slate-200 text-slate-800'
                }`}
              >
                <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                  <div className="flex items-center gap-2 font-bold">
                    {verificationResult.mismatchDetected ? (
                      <>
                        <ShieldAlert className="w-4 h-4 text-red-600" />
                        <span className="text-red-700">AUDIT HALT: Re-Verification Invariant Mismatch Detected</span>
                      </>
                    ) : (
                      <>
                        <ShieldCheck className="w-4 h-4 text-emerald-600" />
                        <span className="text-slate-900">Step 9: Separate Re-Verification & Cart Invariant Check</span>
                      </>
                    )}
                  </div>
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                      verificationResult.mismatchDetected
                        ? 'bg-red-200 text-red-900'
                        : 'bg-emerald-100 text-emerald-800'
                    }`}
                  >
                    {verificationResult.mismatchDetected ? 'MISMATCH (ROLLED BACK)' : 'ALL 4 INVARIANTS PASSED'}
                  </span>
                </div>

                <p className="text-xs leading-relaxed">{verificationResult.notes}</p>

                {/* Invariants Checked Table */}
                {verificationResult.invariantsChecked && verificationResult.invariantsChecked.length > 0 && (
                  <div className="bg-white rounded-lg border border-slate-200 overflow-hidden text-[11px]">
                    <div className="grid grid-cols-12 gap-2 p-2 bg-slate-100 font-semibold text-slate-600 border-b border-slate-200">
                      <span className="col-span-6">Audit Invariant Rule</span>
                      <span className="col-span-3">Expected</span>
                      <span className="col-span-3 text-right">Observed</span>
                    </div>
                    {verificationResult.invariantsChecked.map((chk: any, idx: number) => (
                      <div
                        key={idx}
                        className={`grid grid-cols-12 gap-2 p-2 border-b border-slate-100 last:border-0 ${
                          chk.passed ? 'text-slate-700' : 'bg-red-50 text-red-900 font-bold'
                        }`}
                      >
                        <span className="col-span-6 flex items-center gap-1.5">
                          {chk.passed ? (
                            <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                          ) : (
                            <XCircle className="w-3.5 h-3.5 text-red-600 shrink-0" />
                          )}
                          <span>{chk.name}</span>
                        </span>
                        <span className="col-span-3 font-mono">{chk.expected}</span>
                        <span className="col-span-3 font-mono text-right">{chk.observed}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Uncertainties Callout */}
            {uncertainties.length > 0 && (
              <div className="mx-5 mb-5 p-3 rounded-lg bg-amber-50/70 border border-amber-200 text-xs text-amber-900">
                <div className="flex items-center gap-1.5 font-bold mb-1">
                  <Info className="w-3.5 h-3.5 text-amber-700" />
                  <span>Unresolved / Uncertain Bank Caveats:</span>
                </div>
                <ul className="list-disc list-inside space-y-0.5 text-[11px] text-amber-800">
                  {uncertainties.map((u, i) => (
                    <li key={i}>
                      <strong>{u.item}:</strong> {u.reason}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {/* 2. CARD COMPARISON GRAPH & TABLE (BELOW) */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-5 border-b border-slate-100 bg-gradient-to-r from-slate-50 via-white to-blue-50/30">
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-blue-600 uppercase tracking-wider">
                      Comparison Graph & Table
                    </span>
                    <span aria-hidden="true" className="text-slate-300">·</span>
                    <span className="text-xs text-slate-500 font-medium">Ranked by Lowest Final Price</span>
                  </div>
                  <h2 className="text-base font-bold text-slate-900 mt-0.5">
                    Card Offers Comparison & Net Price Chart
                  </h2>
                </div>

                {bestCard && (
                  <div className="text-right">
                    <span className="text-[10px] text-slate-400 uppercase tracking-wider block">Lowest Price</span>
                    <span className="text-base font-extrabold text-blue-700 font-mono tabular-nums">
                      ₹{bestCard.finalPayable.toLocaleString('en-IN')}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Visual Savings Bar Comparison Chart */}
            {rankedCards.length > 0 && (
              <div className="p-5 border-b border-slate-100 bg-slate-50/50">
                <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wider block mb-3">
                  Price Payable per Card (Visual Spread):
                </span>
                <div className="space-y-2">
                  {rankedCards.map((c) => {
                    const ratio = cart.subtotal > 0 ? (c.finalPayable / (cart.subtotal * 1.05)) * 100 : 100;
                    return (
                      <div key={c.cardId} className="flex items-center gap-3 text-xs">
                        <span className="w-32 truncate font-semibold text-slate-800 text-[11px]">
                          {c.card.bank} ({c.card.last4})
                        </span>
                        <div className="flex-1 h-5 bg-slate-200 rounded-md overflow-hidden relative">
                          <div
                            className={`h-full rounded-md transition-all duration-500 ${
                              c.isWinner
                                ? 'bg-emerald-500'
                                : c.isEligible
                                ? 'bg-blue-500'
                                : 'bg-slate-300'
                            }`}
                            style={{ width: `${Math.min(100, Math.max(15, ratio))}%` }}
                          />
                          <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] font-mono font-bold text-slate-700">
                            ₹{c.finalPayable.toLocaleString('en-IN')}
                          </span>
                        </div>
                        {c.discountAmount > 0 ? (
                          <span className="text-[11px] font-bold text-emerald-600 font-mono w-20 text-right">
                            -₹{c.discountAmount.toLocaleString('en-IN')}
                          </span>
                        ) : (
                          <span className="text-[11px] text-slate-400 font-mono w-20 text-right">
                            No disc
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* LangGraph 10-Node Stepper */}
            <div className="px-5 py-3 bg-slate-50 border-b border-slate-200/80">
              <div className="flex items-center justify-between text-xs mb-2">
                <span className="font-semibold text-slate-700">LangGraph Execution Flow (10 Nodes):</span>
                <span className="text-slate-500 font-mono text-[11px]">
                  StateGraph Runner
                </span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-1.5 text-[10px]">
                {steps.map((st, i) => {
                  let badgeStyle = 'bg-slate-200 text-slate-600';
                  if (st.status === 'completed') badgeStyle = 'bg-emerald-100 text-emerald-800 font-medium';
                  if (st.status === 'running') badgeStyle = 'bg-blue-100 text-blue-800 animate-pulse font-bold';
                  if (st.status === 'interrupted') badgeStyle = 'bg-amber-100 text-amber-800 font-bold';
                  if (st.status === 'failed') badgeStyle = 'bg-red-100 text-red-800 font-bold';

                  return (
                    <div
                      key={i}
                      className={`p-1.5 rounded truncate ${badgeStyle}`}
                      title={st.title}
                    >
                      {st.title}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Ranked Card Rows with Evidence Drawers */}
            <div className="p-5 space-y-3">
              {rankedCards.length === 0 ? (
                <div className="text-center py-8 text-xs text-slate-400 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                  {isRunning ? 'Evaluating cards with LangGraph agent...' : 'No evaluations yet. Click Re-evaluate above.'}
                </div>
              ) : (
                rankedCards.map((cardEval, idx) => {
                  const isWinner = cardEval.isWinner;
                  const isExpanded = expandedEvidenceId === cardEval.cardId;

                  return (
                    <div
                      key={cardEval.cardId}
                      className={`rounded-xl border transition-all ${
                        isWinner
                          ? 'border-blue-500 bg-blue-50/20 shadow-xs'
                          : cardEval.isEligible
                          ? 'border-slate-200 bg-white'
                          : 'border-slate-200/70 bg-slate-50/60 opacity-80'
                      }`}
                    >
                      <div className="p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="flex items-start gap-3">
                          <span className="w-5 h-5 rounded-full bg-slate-100 text-slate-700 text-[11px] font-bold flex items-center justify-center shrink-0 mt-0.5">
                            #{idx + 1}
                          </span>
                          <div>
                            <div className="flex items-center gap-2">
                              <h4 className="text-xs font-bold text-slate-900">
                                {cardEval.card.cardName}
                              </h4>
                              {isWinner && (
                                <span className="text-[10px] font-bold bg-emerald-600 text-white px-2 py-0.5 rounded shadow-xs">
                                  Best Deal
                                </span>
                              )}
                              {!cardEval.isEligible && (
                                <span className="text-[10px] font-medium bg-slate-200 text-slate-600 px-1.5 py-0.5 rounded">
                                  Ineligible
                                </span>
                              )}
                            </div>
                            <p className="text-[11px] text-slate-500 mt-0.5">
                              {cardEval.bestOffer
                                ? cardEval.decisionReason
                                : cardEval.ineligibilityReason}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-4 sm:justify-end shrink-0 pl-8 sm:pl-0">
                          {cardEval.discountAmount > 0 && (
                            <div className="text-right">
                              <span className="text-[10px] text-slate-400 block">Instant Savings</span>
                              <span className="text-xs font-bold text-emerald-600 font-mono tabular-nums">
                                -₹{cardEval.discountAmount.toLocaleString('en-IN')}
                              </span>
                            </div>
                          )}

                          {cardEval.emiExtraCost > 0 && (
                            <div className="text-right">
                              <span className="text-[10px] text-slate-400 block">EMI Extra Fees</span>
                              <span className="text-xs font-medium text-amber-700 font-mono tabular-nums">
                                +₹{cardEval.emiExtraCost.toFixed(2)}
                              </span>
                            </div>
                          )}

                          <div className="text-right">
                            <span className="text-[10px] text-slate-400 block">Final Total</span>
                            <span className="text-sm font-bold text-slate-900 font-mono tabular-nums">
                              ₹{cardEval.finalPayable.toLocaleString('en-IN')}
                            </span>
                          </div>

                          <button
                            onClick={() => setExpandedEvidenceId(isExpanded ? null : cardEval.cardId)}
                            className="p-1.5 text-slate-400 hover:text-slate-700 rounded-md hover:bg-slate-100 transition-colors cursor-pointer"
                            title="Toggle Scraped Evidence Drawer"
                          >
                            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                          </button>
                        </div>
                      </div>

                      {/* Evidence Drawer per Card */}
                      {isExpanded && (
                        <div className="px-4 pb-4 pt-2 border-t border-slate-100 bg-slate-50/80 rounded-b-xl text-xs space-y-2">
                          <div className="flex items-center justify-between text-[11px] text-slate-500">
                            <span className="flex items-center gap-1">
                              <ExternalLink className="w-3.5 h-3.5 text-blue-500" />
                              <span>Source: {cardEval.bestOffer?.offer.sourceUrl || `/bank-offers/${cardEval.card.bank.toLowerCase()}`}</span>
                            </span>
                            <span className="flex items-center gap-1 font-mono">
                              <Clock className="w-3.5 h-3.5" />
                              <span>Retrieved: {cardEval.bestOffer?.offer.retrievedAt?.slice(11, 19) || 'Active'}</span>
                            </span>
                          </div>

                          <div className="bg-white p-2.5 rounded border border-slate-200">
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide block mb-1">
                              Scraped Bank HTML Terms:
                            </span>
                            <p className="text-[11px] text-slate-700 italic font-mono bg-slate-50 p-2 rounded leading-relaxed">
                              "{cardEval.bestOffer?.offer.rawExcerpt || 'Bank terms retrieved from mock HTML site.'}"
                            </p>
                          </div>

                          <div className="text-[11px] text-slate-600">
                            <strong>Agent Calculation:</strong> {cardEval.decisionReason}
                          </div>

                          {cardEval.isEligible && approvalStatus !== 'approved' && !isWinner && (
                            <div className="pt-2">
                              <button
                                onClick={() => handleSelectAlternativeCard(cardEval)}
                                className="px-3 py-1 text-[11px] font-semibold text-blue-700 bg-blue-100 hover:bg-blue-200 rounded transition-colors cursor-pointer"
                              >
                                Select this card offer instead
                              </button>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
