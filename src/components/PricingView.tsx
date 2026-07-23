import React from 'react';
import { Check, ArrowLeft, Zap, Shield, Sparkles, Building, HelpCircle, PhoneCall } from 'lucide-react';
import { QuoteFlowLogo } from './QuoteFlowLogo';

interface PricingViewProps {
  onBackToAuth?: () => void;
  onSelectPlan?: (planName: string) => void;
  isLoggedIn?: boolean;
}

export const PLAN_DETAILS = [
  {
    name: 'Professional',
    price: '1,500 PKR',
    period: 'mo',
    description: 'Best for growing businesses needing standard capacity.',
    storage: '10 GB Cloud Storage',
    customerLimit: '500 Customers',
    productLimit: '1,000 Products',
    quotationLimit: '500 Quotations / mo',
    invoiceLimit: '500 Invoices / mo',
    features: [
      'Professional PDF Export',
      'Local Sales Tax Handling',
      'WhatsApp & Email Sharing',
      'Custom Bank Account details',
      'Detailed Audit History Logs',
      'Advanced Customer Analytics',
    ],
    popular: false,
    color: 'sky',
    icon: Sparkles,
  },
  {
    name: 'Business',
    price: '3,000 PKR',
    period: 'mo',
    description: 'Recommended power suite for growing and full-scale teams.',
    storage: '50 GB Cloud Storage',
    customerLimit: '5,000 Customers',
    productLimit: '10,000 Products',
    quotationLimit: 'Unlimited Quotations / mo',
    invoiceLimit: 'Unlimited Invoices / mo',
    features: [
      'Everything in Professional',
      'Multiple Team Members',
      'Dedicated Customer Support Representative',
      'AI Quotations Generator',
      'Stripe & local API Gateway Ready',
      'Custom Domain White-labeling',
    ],
    popular: true,
    color: 'indigo',
    icon: Building,
  },
  {
    name: 'Enterprise',
    price: '5,000 PKR',
    period: 'mo',
    description: 'Custom SLAs, dedicated infrastructure, and advanced integrations.',
    storage: 'Unlimited Storage',
    customerLimit: 'Unlimited Customers',
    productLimit: 'Unlimited Products',
    quotationLimit: 'Unlimited Quotations / mo',
    invoiceLimit: 'Unlimited Invoices / mo',
    features: [
      'Everything in Business',
      '99.9% Uptime SLA Guarantee',
      'Dedicated Customer Success Manager',
      'Direct API access with rate limit controls',
      'Enterprise-grade custom features on request',
    ],
    popular: false,
    color: 'purple',
    icon: Shield,
  },
];

export function PricingView({ onBackToAuth, onSelectPlan, isLoggedIn = false }: PricingViewProps) {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 dark:bg-slate-950 dark:text-slate-100 transition-colors py-12 px-4 sm:px-6 lg:px-8">
      {/* Background Decorative Circles */}
      <div className="absolute top-0 left-0 right-0 h-96 bg-gradient-to-b from-indigo-500/10 to-transparent pointer-events-none" />
      <div className="absolute top-20 right-10 h-72 w-72 rounded-full bg-sky-500/10 blur-3xl pointer-events-none" />
      <div className="absolute bottom-20 left-10 h-72 w-72 rounded-full bg-purple-500/10 blur-3xl pointer-events-none" />

      <div className="relative max-w-7xl mx-auto z-10">
        
        {/* Navigation & Logo Header */}
        <div className="flex items-center justify-between border-b border-slate-200/60 dark:border-slate-800/60 pb-6 mb-12">
          <div className="flex items-center gap-3">
            <QuoteFlowLogo size={38} />
            <div>
              <span className="font-sans text-lg font-black tracking-tight text-slate-900 dark:text-white">
                QuoteFlow <span className="bg-gradient-to-r from-sky-500 to-indigo-500 bg-clip-text text-transparent">Pro</span>
              </span>
              <p className="text-[9px] font-bold text-indigo-500 dark:text-sky-400 leading-none uppercase tracking-wider">
                Subscription Plans
              </p>
            </div>
          </div>

          {onBackToAuth && (
            <button
              onClick={onBackToAuth}
              className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 transition-all cursor-pointer shadow-sm"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>Back to Auth Portal</span>
            </button>
          )}
        </div>

        {/* Header Text */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-indigo-500/10 px-3.5 py-1 text-xs font-bold text-indigo-600 dark:bg-sky-400/10 dark:text-sky-300 ring-1 ring-indigo-500/20">
            Simple, Transparent Subscription
          </span>
          <h1 className="mt-4 text-4xl font-extrabold tracking-tight text-slate-900 dark:text-white sm:text-5xl">
            Choose the plan that fits your growth.
          </h1>
          <p className="mt-4 text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
            All plans include standard sales tax calculation, client portal links, digital signatures, and offline fallback capabilities. Upgrades apply instantly.
          </p>
        </div>

        {/* Pricing Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-stretch lg:max-w-none max-w-md mx-auto mb-16">
          {PLAN_DETAILS.map((plan) => {
            const IconComponent = plan.icon;
            return (
              <div
                key={plan.name}
                className={`relative flex flex-col justify-between rounded-3xl p-8 border backdrop-blur-sm transition-all duration-300 hover:scale-[1.02] ${
                  plan.popular
                    ? 'border-indigo-500 bg-white dark:bg-slate-900/90 shadow-2xl ring-2 ring-indigo-500/20'
                    : 'border-slate-200 bg-white/70 dark:border-slate-800 dark:bg-slate-900/50 shadow-md'
                }`}
              >
                {/* Popular Badge */}
                {plan.popular && (
                  <span className="absolute -top-3.5 right-6 inline-flex items-center gap-1 rounded-full bg-gradient-to-r from-indigo-600 to-sky-500 px-4 py-1 text-xs font-black text-white shadow-lg shadow-indigo-600/30 uppercase tracking-wider">
                    <Check className="h-3.5 w-3.5" /> Recommended
                  </span>
                )}

                <div>
                  {/* Plan Icon and Name */}
                  <div className="flex items-center gap-3.5 mb-5">
                    <div className={`p-2.5 rounded-2xl ${
                      plan.color === 'indigo' ? 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400' :
                      plan.color === 'sky' ? 'bg-sky-500/10 text-sky-600 dark:text-sky-400' :
                      plan.color === 'emerald' ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' :
                      'bg-purple-500/10 text-purple-600 dark:text-purple-400'
                    }`}>
                      <IconComponent className="h-6 w-6" />
                    </div>
                    <div>
                      <h3 className="text-xl font-extrabold text-slate-900 dark:text-white">{plan.name}</h3>
                      <p className="text-xs text-slate-400 dark:text-slate-500 font-medium">
                        {plan.name === 'Professional' ? 'Growth Tier' : plan.name === 'Business' ? 'Pro Business Tier' : 'Enterprise Tier'}
                      </p>
                    </div>
                  </div>

                  {/* Price */}
                  <div className="flex items-baseline mb-4">
                    <span className="text-4xl font-black text-slate-900 dark:text-white">{plan.price}</span>
                    <span className="text-sm font-semibold text-slate-400 dark:text-slate-500 ml-1">/{plan.period}</span>
                  </div>

                  <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed mb-6">
                    {plan.description}
                  </p>

                  {/* Limit Indicators (Crucial Requirement) */}
                  <div className="border-t border-b border-slate-100 dark:border-slate-800 py-4 mb-6 space-y-2.5">
                    <div className="flex justify-between items-center text-xs">
                      <span className="font-semibold text-slate-500 dark:text-slate-400">Cloud Storage</span>
                      <span className="font-mono font-bold text-slate-800 dark:text-slate-200">{plan.storage}</span>
                    </div>
                    <div className="flex justify-between items-center text-xs">
                      <span className="font-semibold text-slate-500 dark:text-slate-400">Customer Limit</span>
                      <span className="font-mono font-bold text-slate-800 dark:text-slate-200">{plan.customerLimit}</span>
                    </div>
                    <div className="flex justify-between items-center text-xs">
                      <span className="font-semibold text-slate-500 dark:text-slate-400">Product/Item Limit</span>
                      <span className="font-mono font-bold text-slate-800 dark:text-slate-200">{plan.productLimit}</span>
                    </div>
                    <div className="flex justify-between items-center text-xs">
                      <span className="font-semibold text-slate-500 dark:text-slate-400">Quotation Limit</span>
                      <span className="font-mono font-bold text-slate-800 dark:text-slate-200">{plan.quotationLimit}</span>
                    </div>
                    <div className="flex justify-between items-center text-xs">
                      <span className="font-semibold text-slate-500 dark:text-slate-400">Invoice Limit</span>
                      <span className="font-mono font-bold text-slate-800 dark:text-slate-200">{plan.invoiceLimit}</span>
                    </div>
                  </div>

                  {/* Features List */}
                  <div className="space-y-3 mb-8">
                    {plan.features.map((feature) => (
                      <div key={feature} className="flex items-start gap-2.5 text-xs">
                        <Check className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
                        <span className="text-slate-600 dark:text-slate-300">{feature}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Buttons (Requirement) */}
                <div className="space-y-2.5 mt-auto">
                  {isLoggedIn ? (
                    <button
                      onClick={() => onSelectPlan && onSelectPlan(plan.name)}
                      className={`w-full py-2.5 px-4 rounded-xl text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${
                        plan.popular
                          ? 'bg-indigo-600 text-white hover:bg-indigo-500 shadow-md shadow-indigo-600/20'
                          : 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 hover:bg-slate-800 dark:hover:bg-slate-100 shadow-sm'
                      }`}
                    >
                      Upgrade Now
                    </button>
                  ) : (
                    <>
                      <button
                        onClick={() => onSelectPlan && onSelectPlan('register')}
                        className={`w-full py-2.5 px-4 rounded-xl text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${
                          plan.popular
                            ? 'bg-indigo-600 text-white hover:bg-indigo-500 shadow-md shadow-indigo-600/20'
                            : 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 hover:bg-slate-800 dark:hover:bg-slate-100 shadow-sm'
                        }`}
                      >
                        Start 3-Day Free Trial
                      </button>
                    </>
                  )}
                  
                  <button
                    onClick={() => {
                      alert(`Contacting QuoteFlow Pro Enterprise Sales Team regarding the ${plan.name} Plan limit adjustments. We will be in touch via haidubaba16277@gmail.com!`);
                    }}
                    className="w-full py-2 px-4 rounded-xl text-xs font-bold text-slate-500 hover:text-slate-700 hover:bg-slate-100/50 dark:text-slate-400 dark:hover:text-slate-200 dark:hover:bg-slate-800/50 border border-transparent hover:border-slate-200 dark:hover:border-slate-800 transition-all cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    <PhoneCall className="h-3.5 w-3.5" />
                    <span>Contact Sales</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Feature Comparison / FAQ footer */}
        <div className="rounded-3xl border border-slate-200/80 bg-white/50 p-8 shadow-sm dark:border-slate-800/80 dark:bg-slate-900/30 max-w-4xl mx-auto text-center">
          <HelpCircle className="h-8 w-8 text-indigo-500 mx-auto mb-3" />
          <h4 className="font-extrabold text-slate-900 dark:text-white text-base">Frequently Asked Questions</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-left mt-6">
            <div>
              <h5 className="font-bold text-slate-800 dark:text-slate-200 text-xs">Can I upgrade or downgrade later?</h5>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                Yes! You can instantly scale your subscription plan or billing intervals directly from the Billing page inside your workspace.
              </p>
            </div>
            <div>
              <h5 className="font-bold text-slate-800 dark:text-slate-200 text-xs">What payment methods do you support?</h5>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                We accept major Credit/Debit Cards, Bank Transfer, JazzCash, Easypaisa, and manual bank invoices. Our system is fully payment-method agnostic.
              </p>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
