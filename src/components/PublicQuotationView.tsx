import React, { useEffect, useState } from 'react';
import { 
  FileText, 
  Printer, 
  CheckCircle2, 
  AlertCircle, 
  Loader2, 
  Building2, 
  Phone, 
  Mail, 
  Globe, 
  PenTool, 
  X,
  Sparkles,
  ArrowLeft,
  ExternalLink
} from 'lucide-react';
import { GlassCard } from './GlassCard';
import { dataService } from '../services/dataService';
import { Quotation, CompanySettings } from '../types/business';

interface PublicQuotationViewProps {
  quoteNumber: string;
  onBackToApp?: () => void; // Optional if they want to exit public view to return to admin
}

export function PublicQuotationView({ quoteNumber, onBackToApp }: PublicQuotationViewProps) {
  const [loading, setLoading] = useState(true);
  const [quotation, setQuotation] = useState<Quotation | null>(null);
  const [companySettings, setCompanySettings] = useState<CompanySettings | null>(null);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  // Sign & Approval Modal State
  const [isSignModalOpen, setIsSignModalOpen] = useState(false);
  const [signerName, setSignerName] = useState('');
  const [isSubmittingApproval, setIsSubmittingApproval] = useState(false);

  // Rejection Modal State
  const [isRejectModalOpen, setIsRejectModalOpen] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [isSubmittingRejection, setIsSubmittingRejection] = useState(false);

  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  const loadData = async () => {
    setLoading(true);
    try {
      const [quote, settings] = await Promise.all([
        dataService.getPublicQuotation(quoteNumber),
        dataService.getCompanySettings()
      ]);
      setQuotation(quote);
      setCompanySettings(settings);
    } catch (err) {
      console.error('Failed to load public quotation page:', err);
      showToast('Could not load quotation details from database.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (quoteNumber) {
      loadData();
    }
  }, [quoteNumber]);

  const handlePrint = () => {
    window.print();
  };

  const handleAcceptSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!signerName.trim() || !quotation) {
      showToast('Please specify a valid name for digital endorsement.', 'error');
      return;
    }

    setIsSubmittingApproval(true);
    try {
      const timestamp = new Date().toISOString();
      const success = await dataService.updatePublicQuotationStatus(quotation.id, 'Accepted', {
        signatureName: signerName.trim(),
        signatureDate: timestamp
      });

      if (success) {
        showToast('Digital signature registered. Proposal successfully Accepted!', 'success');
        setIsSignModalOpen(false);
        setSignerName('');
        // Reload data to reflect acceptance status
        await loadData();
      } else {
        showToast('Failed to record digital approval.', 'error');
      }
    } catch (err: any) {
      console.error('Approval submission failed:', err);
      showToast(err.message || 'An error occurred during sign-off.', 'error');
    } finally {
      setIsSubmittingApproval(false);
    }
  };

  const handleRejectSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rejectionReason.trim() || !quotation) {
      showToast('Please specify a reason for declining this proposal.', 'error');
      return;
    }

    setIsSubmittingRejection(true);
    try {
      const timestamp = new Date().toISOString();
      const success = await dataService.updatePublicQuotationStatus(quotation.id, 'Rejected', {
        rejectionReason: rejectionReason.trim(),
        rejectedDate: timestamp
      });

      if (success) {
        showToast('Feedback recorded. Proposal status marked as Rejected.', 'success');
        setIsRejectModalOpen(false);
        setRejectionReason('');
        // Reload data to reflect rejection status
        await loadData();
      } else {
        showToast('Failed to record decline feedback.', 'error');
      }
    } catch (err: any) {
      console.error('Rejection submission failed:', err);
      showToast(err.message || 'An error occurred.', 'error');
    } finally {
      setIsSubmittingRejection(false);
    }
  };

  // Extract signature notes if they exist to display beautifully
  const parsedSignature = quotation?.notes && quotation.notes.includes('Digitally Approved & Signed by')
    ? quotation.notes.match(/\[Digitally Approved & Signed by (.*) on (.*)\]/)
    : null;

  // Extract rejection notes if they exist to display beautifully
  const parsedRejection = quotation?.notes && quotation.notes.includes('Rejected Reason:')
    ? quotation.notes.match(/\[Rejected Reason: (.*) on (.*)\]/)
    : null;

  if (loading) {
    return (
      <div className="flex min-h-screen w-full flex-col items-center justify-center bg-slate-50 dark:bg-slate-950 p-6">
        <div className="flex flex-col items-center gap-2">
          <Loader2 className="h-8 w-8 animate-spin text-indigo-600 dark:text-sky-400" />
          <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 font-mono">Loading Customer Proposal Portal...</p>
        </div>
      </div>
    );
  }

  if (!quotation) {
    return (
      <div className="flex min-h-screen w-full flex-col items-center justify-center bg-slate-50 dark:bg-slate-950 p-6 text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-rose-50 dark:bg-rose-950/20 text-rose-500 mb-4">
          <FileText className="h-7 w-7" />
        </div>
        <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">Proposal Not Found</h3>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 max-w-sm leading-relaxed">
          The requested quotation serial <strong>{quoteNumber}</strong> does not exist in the register, has been archived, or you lack the permission to retrieve it.
        </p>
        {onBackToApp && (
          <button
            onClick={onBackToApp}
            className="mt-6 inline-flex items-center gap-1.5 text-xs font-bold text-indigo-600 hover:underline"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Return to Application</span>
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100 py-10 px-4 sm:px-6 print:py-0 print:px-0">
      
      {/* Dynamic Toast */}
      {toast && (
        <div className={`fixed top-6 right-6 z-50 flex items-center gap-2.5 rounded-xl border px-4 py-3 text-xs font-bold shadow-lg animate-slide-in ${
          toast.type === 'success'
            ? 'border-emerald-100 bg-emerald-50 text-emerald-800 dark:border-emerald-950/20 dark:bg-emerald-950/30 dark:text-emerald-400'
            : 'border-rose-100 bg-rose-50 text-rose-800 dark:border-rose-950/20 dark:bg-rose-950/30 dark:text-rose-400'
        }`}>
          {toast.type === 'success' ? (
            <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
          ) : (
            <AlertCircle className="h-4 w-4 text-rose-600 dark:text-rose-400" />
          )}
          <span>{toast.message}</span>
        </div>
      )}

      {/* iframe warning banner */}
      {typeof window !== 'undefined' && window.self !== window.top && (
        <div className="max-w-4xl mx-auto mb-6 rounded-2xl border border-amber-200/60 bg-amber-50/70 p-4 text-slate-800 dark:border-amber-950/20 dark:bg-amber-950/20 dark:text-amber-300 print:hidden flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between shadow-xs animate-fade-in">
          <div className="flex gap-3 items-start">
            <AlertCircle className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
            <div className="space-y-1 flex-1">
              <p className="text-xs font-black uppercase tracking-wider text-amber-800 dark:text-amber-400 font-sans">PDF Download & Printing Guide</p>
              <p className="text-[11px] leading-relaxed font-sans text-slate-600 dark:text-slate-400">
                Standard PDF downloads and browser printing are restricted within the sandboxed development iframe. 
                Please open this proposal in a <strong>new tab</strong> to view, print, or download high-quality documents successfully!
              </p>
            </div>
          </div>
          <a
            href={window.location.href}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white px-4 py-2 text-xs font-bold transition-all shadow-md shadow-amber-500/10 shrink-0 active:scale-98"
          >
            <ExternalLink className="h-3.5 w-3.5" />
            <span>Open in New Tab</span>
          </a>
        </div>
      )}

      {/* Action panel at the top (disappears in print) */}
      <div className="max-w-4xl mx-auto mb-6 flex flex-col sm:flex-row gap-4 items-center justify-between bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800/80 p-4 rounded-2xl shadow-sm print:hidden">
        
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-xl bg-gradient-to-tr from-sky-500 to-indigo-600 text-white flex items-center justify-center">
            <Sparkles className="h-4.5 w-4.5 animate-pulse" />
          </div>
          <div>
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-400 dark:text-slate-500">Online Proposal Portal</h3>
            <p className="text-xs font-bold text-slate-800 dark:text-white">Estimate: {quotation.quoteNumber}</p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2 justify-center">
          {typeof window !== 'undefined' && window.self !== window.top && (
            <a
              href={window.location.href}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 rounded-xl border border-amber-200 bg-amber-50 hover:bg-amber-100/80 px-4 py-2 text-xs font-bold text-amber-800 dark:border-amber-950/40 dark:bg-amber-950/30 dark:text-amber-300 dark:hover:bg-amber-950/50 transition-colors"
            >
              <ExternalLink className="h-4 w-4" />
              <span>Open in New Tab</span>
            </a>
          )}

          {onBackToApp && (
            <button
              onClick={onBackToApp}
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 px-4 py-2 text-xs font-bold dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>Sign In / Admin</span>
            </button>
          )}

          <button
            onClick={handlePrint}
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 px-4 py-2 text-xs font-bold dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 transition-colors"
          >
            <Printer className="h-4 w-4" />
            <span>Print or Save PDF</span>
          </button>

          {/* Accept / Reject interactions if not already processed */}
          {quotation.status !== 'Accepted' && quotation.status !== 'Converted' && quotation.status !== 'Rejected' ? (
            <>
              <button
                onClick={() => setIsRejectModalOpen(true)}
                className="rounded-xl border border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100/50 px-4 py-2 text-xs font-bold dark:border-rose-950/20 dark:bg-rose-950/20 dark:text-rose-400 transition-colors"
              >
                Decline
              </button>
              <button
                onClick={() => setIsSignModalOpen(true)}
                className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-sky-500 to-indigo-600 px-4 py-2 text-xs font-bold text-white shadow-md shadow-indigo-500/10 hover:opacity-95"
              >
                <PenTool className="h-4 w-4" />
                <span>Approve & Sign</span>
              </button>
            </>
          ) : (
            <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider border ${
              quotation.status === 'Accepted' || quotation.status === 'Converted'
                ? 'border-emerald-100 bg-emerald-50 text-emerald-700 dark:border-emerald-950/20 dark:bg-emerald-950/30 dark:text-emerald-400'
                : 'border-rose-100 bg-rose-50 text-rose-700 dark:border-rose-950/20 dark:bg-rose-950/30 dark:text-rose-400'
            }`}>
              {quotation.status === 'Converted' ? 'Accepted & Invoiced' : quotation.status}
            </span>
          )}
        </div>

      </div>

      {/* MAIN DOCUMENT PAGE */}
      <div className="bg-white text-slate-900 p-8 sm:p-12 rounded-2xl border border-slate-200 max-w-4xl mx-auto shadow-sm print:shadow-none print:border-none print:p-0 font-sans print:bg-transparent">
        
        {/* Header Brand */}
        <div className="flex flex-col sm:flex-row justify-between gap-6 border-b border-slate-200 pb-8">
          <div className="space-y-2">
            {companySettings?.logoUrl ? (
              <img 
                src={companySettings.logoUrl} 
                alt="Company Logo" 
                className="max-h-12 w-auto object-contain referrerPolicy='no-referrer'" 
              />
            ) : (
              <div className="h-10 w-10 flex items-center justify-center bg-indigo-600 text-white font-black rounded-lg">
                QF
              </div>
            )}
            
            <h1 className="text-lg font-black tracking-tight text-slate-900 uppercase">
              {companySettings?.companyName || 'Your Company Name (Pvt) Ltd'}
            </h1>
            
            <div className="text-[10px] text-slate-500 space-y-0.5">
              <p>{companySettings?.address || 'Street address, Office details'}</p>
              <p>Phone: {companySettings?.phone || 'N/A'} | Email: {companySettings?.email || 'N/A'}</p>
              {companySettings?.website && <p>Website: {companySettings.website}</p>}
              {companySettings?.taxNumber && <p className="font-bold">NTN / STRN: {companySettings.taxNumber}</p>}
            </div>
          </div>

          <div className="sm:text-right space-y-2">
            <span className="inline-block text-[11px] font-black uppercase tracking-widest text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-md">
              Proposal Contract
            </span>
            
            <div className="text-xs font-mono pt-2 space-y-1">
              <p><span className="font-bold text-slate-400 uppercase tracking-wider">Quote No:</span> <span className="font-black text-slate-900">{quotation.quoteNumber}</span></p>
              <p><span className="font-bold text-slate-400 uppercase tracking-wider">Issue Date:</span> {quotation.issueDate}</p>
              <p><span className="font-bold text-slate-400 uppercase tracking-wider">Valid Until:</span> {quotation.expiryDate}</p>
              <p><span className="font-bold text-slate-400 uppercase tracking-wider">Status:</span> <span className="font-bold text-indigo-600 uppercase">{quotation.status}</span></p>
            </div>
          </div>
        </div>

        {/* Recipient details */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 py-8 border-b border-slate-200 text-xs">
          <div>
            <span className="block text-[9px] font-black uppercase tracking-widest text-slate-400 mb-2">Attention Client:</span>
            <span className="block font-black text-slate-900 text-sm">{quotation.customerName}</span>
            {quotation.companyName && quotation.companyName !== 'N/A' && (
              <span className="block font-bold text-indigo-600 mt-0.5">{quotation.companyName}</span>
            )}
          </div>
        </div>

        {/* Table line items */}
        <div className="py-8">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-300 text-[9px] font-black uppercase tracking-widest text-slate-400 pb-2">
                <th className="py-2.5 w-1/12 text-center">#</th>
                <th className="py-2.5 w-6/12">Itemized Product / Service Deliverables</th>
                <th className="py-2.5 w-1/12 text-center">Qty</th>
                <th className="py-2.5 w-2/12 text-right">Unit Price (PKR)</th>
                <th className="py-2.5 w-2/12 text-right">Total (PKR)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {quotation.items && quotation.items.length > 0 ? (
                quotation.items.map((item, idx) => (
                  <tr key={idx} className="py-3">
                    <td className="py-3 text-center font-mono text-slate-400">{idx + 1}</td>
                    <td className="py-3">
                      <span className="font-bold text-slate-800 block text-[13px]">{item.productName}</span>
                    </td>
                    <td className="py-3 text-center font-mono text-slate-600">{item.quantity}</td>
                    <td className="py-3 text-right font-mono text-slate-600">
                      Rs. {item.unitPrice.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="py-3 text-right font-mono font-bold text-slate-800">
                      Rs. {(item.quantity * item.unitPrice).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="py-4 text-center italic text-slate-400">No line items specified.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Bottom summary and signatures */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-6 border-t border-slate-200 text-xs">
          
          <div className="space-y-4">
            {quotation.terms && (
              <div>
                <span className="block text-[9px] font-black uppercase tracking-widest text-slate-400 mb-1">Contractual Terms:</span>
                <p className="text-[10px] text-slate-500 whitespace-pre-line leading-relaxed font-sans">{quotation.terms}</p>
              </div>
            )}

            {/* Render Digital signature area beautifully if Accepted */}
            {(quotation.status === 'Accepted' || quotation.status === 'Converted') && (
              <div className="bg-emerald-50/50 border border-emerald-100 p-4 rounded-xl space-y-2 animate-fade-in">
                <span className="block text-[9px] font-black uppercase tracking-widest text-emerald-800">Contract Endorsement:</span>
                <div className="border border-dashed border-emerald-200 bg-white p-3 rounded-lg text-center">
                  <span className="block font-serif text-lg italic text-emerald-800 font-bold select-none">
                    {parsedSignature ? parsedSignature[1] : (quotation.signatureName || 'Approved Digitally')}
                  </span>
                  <div className="border-t border-slate-200 w-32 mx-auto my-1"></div>
                  <span className="block text-[9px] text-slate-400 font-mono">
                    Approved online on: {parsedSignature ? new Date(parsedSignature[2]).toLocaleString() : new Date().toLocaleString()}
                  </span>
                </div>
              </div>
            )}

            {/* Render Rejection feedback if Rejected */}
            {quotation.status === 'Rejected' && (
              <div className="bg-rose-50/50 border border-rose-100 p-4 rounded-xl space-y-2 animate-fade-in">
                <span className="block text-[9px] font-black uppercase tracking-widest text-rose-800">Declined Feedback:</span>
                <p className="text-[10px] italic text-rose-700 font-medium">
                  "{parsedRejection ? parsedRejection[1] : (quotation.rejectionReason || 'Decline requested.')}"
                </p>
                <span className="block text-[9px] text-slate-400 font-mono">
                  Submitted on: {parsedRejection ? new Date(parsedRejection[2]).toLocaleString() : new Date().toLocaleString()}
                </span>
              </div>
            )}
          </div>

          <div className="space-y-2.5 self-start md:pl-12 font-mono">
            <div className="flex justify-between text-slate-500 text-[11px]">
              <span>Itemised Subtotal:</span>
              <span>Rs. {quotation.subtotal.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
            </div>

            {quotation.discountValue > 0 && (
              <div className="flex justify-between text-rose-500 text-[11px] font-semibold">
                <span>Discount Applied:</span>
                <span>- Rs. {((quotation.discountType === 'percentage' ? (quotation.subtotal * quotation.discountValue / 100) : quotation.discountValue)).toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
              </div>
            )}

            {quotation.taxAmount > 0 && (
              <div className="flex justify-between text-amber-600 text-[11px] font-semibold">
                <span>GST Tax ({quotation.taxPercentage}%):</span>
                <span>+ Rs. {quotation.taxAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
              </div>
            )}

            <div className="flex justify-between text-slate-900 text-xs font-black pt-2.5 border-t border-slate-300">
              <span>GRAND TOTAL (PKR):</span>
              <span className="text-[13px] font-black text-indigo-600">Rs. {quotation.grandTotal.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
            </div>

            {quotation.notes && !parsedSignature && !parsedRejection && (
              <div className="pt-4 border-t border-dashed border-slate-200 font-sans font-normal text-[10px] text-slate-400 italic">
                <span className="font-bold uppercase not-italic block mb-0.5 text-slate-500">Client Greetings:</span>
                {quotation.notes}
              </div>
            )}
          </div>

        </div>

        {/* Print Footer */}
        <div className="hidden print:block text-center text-[9px] text-slate-400 font-mono mt-16 pt-8 border-t border-slate-100">
          Generated via QuoteFlow PK. Client digital signature validated. Page 1 of 1.
        </div>

      </div>

      {/* SIGNATURE / APPROVAL DIALOG MODAL */}
      {isSignModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/40 backdrop-blur-xs animate-fade-in">
          <div className="relative w-full max-w-sm overflow-hidden rounded-2xl border border-indigo-100 bg-white p-5 shadow-2xl dark:border-indigo-950/20 dark:bg-slate-950">
            
            <button
              onClick={() => setIsSignModalOpen(false)}
              className="absolute right-4 top-4 p-1 rounded-lg text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-900"
            >
              <X className="h-4 w-4" />
            </button>

            <div className="flex items-center gap-2 mb-4">
              <div className="p-2 bg-indigo-50 dark:bg-indigo-950/30 text-indigo-600 dark:text-sky-300 rounded-lg">
                <PenTool className="h-5 w-5" />
              </div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">Sign-Off Endorsement</h3>
            </div>

            <form onSubmit={handleAcceptSubmit} className="space-y-4 text-xs font-sans">
              <p className="text-slate-500 leading-relaxed">
                By entering your full legal name below, you record a digital approval signature of estimate <strong>{quotation.quoteNumber}</strong> for the sum of <strong>Rs. {quotation.grandTotal.toLocaleString()}</strong>.
              </p>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Authorized Signatory Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Muhammad Ali"
                  value={signerName}
                  onChange={(e) => setSignerName(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-white/50 px-3 py-2 text-xs font-bold text-slate-800 focus:outline-hidden focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/20 dark:border-slate-800 dark:bg-slate-900 dark:text-white"
                />
              </div>

              <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-100 dark:border-amber-900/30 p-3 rounded-xl text-[10px] text-amber-800 dark:text-amber-400">
                This forms a legally binding digital sign-off and records an IP & audit timestamp with the vendor.
              </div>

              <div className="flex justify-end gap-2 mt-6">
                <button
                  type="button"
                  onClick={() => setIsSignModalOpen(false)}
                  className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingApproval}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-sky-500 to-indigo-600 px-4 py-2 text-xs font-bold text-white hover:opacity-95 disabled:opacity-50"
                >
                  {isSubmittingApproval && <Loader2 className="h-3 w-3 animate-spin" />}
                  <span>Sign & Approve</span>
                </button>
              </div>
            </form>

          </div>
        </div>
      )}

      {/* REJECTION DIALOG MODAL */}
      {isRejectModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/40 backdrop-blur-xs animate-fade-in">
          <div className="relative w-full max-w-sm overflow-hidden rounded-2xl border border-rose-100 bg-white p-5 shadow-2xl dark:border-rose-950/20 dark:bg-slate-950">
            
            <button
              onClick={() => setIsRejectModalOpen(false)}
              className="absolute right-4 top-4 p-1 rounded-lg text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-900"
            >
              <X className="h-4 w-4" />
            </button>

            <div className="flex items-center gap-2 mb-4">
              <div className="p-2 bg-rose-50 dark:bg-rose-950/30 text-rose-600 dark:text-rose-400 rounded-lg">
                <AlertCircle className="h-5 w-5" />
              </div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">Decline Proposal</h3>
            </div>

            <form onSubmit={handleRejectSubmit} className="space-y-4 text-xs font-sans">
              <p className="text-slate-500 leading-relaxed">
                Please let us know why you are choosing to decline estimate <strong>{quotation.quoteNumber}</strong>. We value your feedback.
              </p>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Rejection Reason / Feedback *</label>
                <textarea
                  required
                  rows={3}
                  placeholder="e.g. Budget limitations or scope adjustments required..."
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-white/50 px-3 py-2 text-xs text-slate-800 focus:outline-hidden focus:border-rose-500 focus:ring-1 focus:ring-rose-500/20 dark:border-slate-800 dark:bg-slate-900 dark:text-white resize-none"
                />
              </div>

              <div className="flex justify-end gap-2 mt-6">
                <button
                  type="button"
                  onClick={() => setIsRejectModalOpen(false)}
                  className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingRejection}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-rose-600 px-4 py-2 text-xs font-bold text-white hover:bg-rose-700 disabled:opacity-50"
                >
                  {isSubmittingRejection && <Loader2 className="h-3 w-3 animate-spin" />}
                  <span>Decline Estimate</span>
                </button>
              </div>
            </form>

          </div>
        </div>
      )}

    </div>
  );
}
