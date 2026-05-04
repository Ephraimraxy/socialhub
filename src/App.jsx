import React, { useEffect, useMemo, useState } from 'react';
import {
  Activity,
  ArrowRight,
  BadgeDollarSign,
  CalendarClock,
  Check,
  ChevronRight,
  CircleAlert,
  ClipboardList,
  Cpu,
  CreditCard,
  FileText,
  Film,
  KeyRound,
  Link2,
  LogOut,
  Loader2,
  LockKeyhole,
  Mic2,
  Pencil,
  Play,
  PlugZap,
  Plus,
  RefreshCcw,
  Rocket,
  Save,
  Send,
  ShieldCheck,
  Sparkles,
  SquareStack,
  TimerReset,
  Trash2,
  UploadCloud,
  Users,
  UserPlus,
  Wand2,
  X,
} from 'lucide-react';
import { api, setToken } from './api.js';

function formatPrice(plan) {
  if (!plan || !plan.priceMonthly) return '';
  return new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency: plan.currency || 'NGN',
    maximumFractionDigits: 0,
  }).format(plan.priceMonthly);
}

const platformSeed = [
  {
    id: 'youtube',
    name: 'YouTube',
    handle: '',
    color: '#d92d20',
    capability: 'Direct upload and schedule after Google verification',
    api: 'YouTube Data API videos.insert',
    risk: 'High quota cost and audit approval',
    status: 'Ready for OAuth',
    automation: 'Direct',
  },
  {
    id: 'instagram',
    name: 'Instagram',
    handle: '',
    color: '#c13584',
    capability: 'Publish Reels and media for Business or Creator accounts',
    api: 'Instagram Graph API Content Publishing',
    risk: 'Meta app review and Business account requirement',
    status: 'Needs Meta app',
    automation: 'Direct',
  },
  {
    id: 'facebook',
    name: 'Facebook',
    handle: '',
    color: '#1877f2',
    capability: 'Publish to Facebook Pages with page permissions',
    api: 'Facebook Pages API',
    risk: 'Page-only publishing, app review required',
    status: 'Needs Meta app',
    automation: 'Direct',
  },
  {
    id: 'tiktok',
    name: 'TikTok',
    handle: '',
    color: '#111111',
    capability: 'Direct post if approved, otherwise inbox/manual approval',
    api: 'TikTok Content Posting API',
    risk: 'Strict API approval and posting limits',
    status: 'Approval required',
    automation: 'Hybrid',
  },
];

const phases = [
  {
    title: 'Foundation',
    weeks: 'Week 1-2',
    state: 'Start here',
    items: ['React client portal', 'Node API scaffold', 'PostgreSQL schema', 'Paystack subscription gates'],
  },
  {
    title: 'AI Factory',
    weeks: 'Week 3-4',
    state: 'Prototype',
    items: ['Claude prompts', 'Brand voice profiles', 'ElevenLabs voice jobs', 'Video render pipeline'],
  },
  {
    title: 'Publishing',
    weeks: 'Week 5-7',
    state: 'Core build',
    items: ['OAuth vault', 'YouTube upload', 'Meta publishing', 'TikTok direct/inbox flow'],
  },
  {
    title: 'Review',
    weeks: 'Week 8-9',
    state: 'Compliance',
    items: ['Privacy policy', 'Terms', 'Google verification', 'Meta app review', 'TikTok audit prep'],
  },
  {
    title: 'Launch',
    weeks: 'Week 10',
    state: 'Revenue',
    items: ['Usage limits', 'Client onboarding', 'Analytics', 'Support workflows'],
  },
];

const serviceMap = [
  { label: 'Claude', owner: 'Anthropic', use: 'Ideas, scripts, captions, hashtags', checkId: 'claude' },
  { label: 'ElevenLabs', owner: 'ElevenLabs', use: 'Voiceover generation', checkId: 'elevenlabs' },
  { label: 'Renderer', owner: 'Remotion or Creatomate', use: 'Vertical video creation', checkId: 'renderer' },
  { label: 'R2 Storage', owner: 'Cloudflare', use: 'Media asset storage for renders', checkId: 'r2_storage' },
  { label: 'YouTube', owner: 'Google', use: 'Video uploads and scheduling', checkId: 'google_oauth' },
  { label: 'Meta', owner: 'Facebook/Instagram', use: 'Page and Reels publishing', checkId: 'meta_oauth' },
  { label: 'TikTok', owner: 'TikTok', use: 'Direct post or inbox approval', checkId: 'tiktok_oauth' },
  { label: 'Paystack', owner: 'Paystack', use: 'Plans, recurring billing, invoices, limits', checkId: 'paystack_secret' },
];

const emptyQueue = [];

const defaultForm = {
  topic: '',
  audience: '',
  tone: '',
  offer: '',
  format: 'short-form video',
};

const emptyCampaign = {
  title: 'No campaign generated yet',
  script: [],
  captions: [],
};

function App() {
  const [activeView, setActiveView] = useState('dashboard');
  const [booting, setBooting] = useState(true);
  const [session, setSession] = useState(null);
  const [tenant, setTenant] = useState(null);
  const [apiError, setApiError] = useState('');
  const [platforms, setPlatforms] = useState(mergePlatforms([]));
  const [form, setForm] = useState(defaultForm);
  const [selectedPlatforms, setSelectedPlatforms] = useState(['youtube', 'instagram', 'facebook', 'tiktok']);
  const [campaign, setCampaign] = useState(emptyCampaign);
  const [queue, setQueue] = useState(emptyQueue);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [plan, setPlan] = useState('starter');
  const [plans, setPlans] = useState([]);
  const [subscription, setSubscription] = useState(null);
  const [readiness, setReadiness] = useState(null);
  const [integrationSettings, setIntegrationSettings] = useState(null);
  const [integrationOptions, setIntegrationOptions] = useState({
    claudeModels: [],
    elevenLabsModels: [],
    elevenLabsVoices: [],
    errors: [],
  });
  const [authProviders, setAuthProviders] = useState({ google: false });

  const connectedCount = platforms.filter((platform) => platform.connected).length;
  const directPlatforms = platforms.filter((platform) => platform.automation === 'Direct').length;
  const activePlan = plans.find((item) => item.id === plan);
  const projectedCost = formatPrice(activePlan);

  const selectedPlatformNames = useMemo(
    () => platformSeed.filter((platform) => selectedPlatforms.includes(platform.id)).map((platform) => platform.name),
    [selectedPlatforms],
  );

  useEffect(() => {
    let mounted = true;

    const urlParams = new URLSearchParams(window.location.search);
    const urlToken = urlParams.get('token');
    const authError = urlParams.get('auth_error');
    if (urlToken) {
      setToken(urlToken);
      window.history.replaceState({}, '', window.location.pathname);
    }
    if (authError) {
      setApiError(decodeURIComponent(authError));
      window.history.replaceState({}, '', window.location.pathname);
    }

    api
      .me()
      .then((payload) => {
        if (!mounted) return;
        if (payload.authProviders) setAuthProviders(payload.authProviders);
        if (payload.user) hydrate(payload);
      })
      .catch((error) => setApiError(error.message))
      .finally(() => mounted && setBooting(false));
    return () => {
      mounted = false;
    };
  }, []);

  function hydrate(payload) {
    setSession(payload.user || null);
    setTenant(payload.tenant || null);
    setPlatforms(mergePlatforms(payload.platforms || []));
    setPlans(payload.plans || []);
    setSubscription(payload.subscription || null);
    setReadiness(payload.readiness || null);
    setIntegrationSettings(payload.integrationSettings || null);
    setPlan(payload.subscription?.planId || payload.plans?.[0]?.id || 'starter');
    setQueue(queueFromData(payload.campaigns || [], payload.publishJobs || []));

    if (payload.brandProfile) {
      setForm((current) => ({
        ...current,
        audience: payload.brandProfile.audience || current.audience,
        tone: payload.brandProfile.voice || current.tone,
        offer: payload.brandProfile.offer || current.offer,
      }));
    }

    const latestCampaign = payload.campaigns?.[0];
    if (latestCampaign) {
      setCampaign(latestCampaign);
    }
  }

  async function handleAuth(payload) {
    setApiError('');
    try {
      const result = payload.mode === 'login'
        ? await api.login(payload)
        : await api.register(payload);
      setToken(result.token);
      hydrate(result);
    } catch (error) {
      setApiError(error.message);
    }
  }

  async function handleGoogleAuth() {
    setApiError('');
    try {
      const result = await api.startGoogleAuth();
      window.location.href = result.authorizationUrl;
    } catch (error) {
      setApiError(error.message);
    }
  }

  async function finishOnboarding(answers) {
    setApiError('');
    try {
      const result = await api.completeOnboarding(answers);
      hydrate(result);
    } catch (error) {
      setApiError(error.message);
    }
  }

  function logout() {
    setToken('');
    setSession(null);
    setTenant(null);
    setQueue(emptyQueue);
    setPlatforms(mergePlatforms([]));
  }

  async function togglePlatform(platformId) {
    const target = platforms.find((platform) => platform.id === platformId);
    setApiError('');
    try {
      if (target?.connected) return;
      const result = await api.startOAuth(platformId);
      window.location.href = result.authorizationUrl;
    } catch (error) {
      setApiError(error.message);
    }
  }

  function toggleTarget(platformId) {
    setSelectedPlatforms((current) =>
      current.includes(platformId)
        ? current.filter((id) => id !== platformId)
        : [...current, platformId],
    );
  }

  function updateForm(key, value) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function generateCampaign() {
    setIsGenerating(true);
    setApiError('');
    try {
      const result = await api.generateCampaign({ ...form, platforms: selectedPlatforms });
      setCampaign(result.campaign);
      setQueue((current) => [
        {
          id: result.campaign.id,
          title: result.campaign.title,
          channel: 'Draft campaign',
          date: new Date(result.campaign.createdAt).toISOString().slice(0, 10),
          time: new Date(result.campaign.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          status: result.campaign.status,
          progress: 40,
        },
        ...current.filter((item) => item.id !== result.campaign.id),
      ]);
    } catch (error) {
      setApiError(error.message);
    } finally {
      setIsGenerating(false);
    }
  }

  async function addToQueue() {
    if (!campaign.id) {
      await generateCampaign();
      return;
    }

    setIsProcessing(true);
    setApiError('');
    try {
      await api.createVoice(campaign.id);
      await api.createRender(campaign.id);
      const result = await api.scheduleCampaign(campaign.id, {
        publishAt: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
      });
      setQueue((current) => [...jobsToQueue(result.jobs, [campaign]), ...current]);
    } catch (error) {
      setApiError(error.message);
    } finally {
      setIsProcessing(false);
    }
  }

  async function checkout(planId) {
    setApiError('');
    try {
      const result = await api.checkout(planId);
      setPlan(planId);
      window.location.href = result.authorizationUrl;
    } catch (error) {
      setApiError(error.message);
    }
  }

  useEffect(() => {
    if (!session) return undefined;
    const timer = window.setInterval(() => {
      refreshRuntime(true);
    }, 1000);
    return () => window.clearInterval(timer);
  }, [session?.id]);

  async function refreshRuntime(silent = false) {
    try {
      const payload = await api.runtime();
      setSession(payload.user || null);
      setPlans(payload.plans || []);
      setReadiness(payload.readiness || null);
      setIntegrationSettings(payload.integrationSettings || null);
      setPlan((current) => {
        const nextPlans = payload.plans || [];
        return nextPlans.some((item) => item.id === current) ? current : nextPlans[0]?.id || current;
      });
    } catch (error) {
      if (!silent) setApiError(error.message);
    }
  }

  async function saveBillingPlan(payload) {
    setApiError('');
    const request = payload.originalId
      ? api.updateBillingPlan(payload.originalId, payload)
      : api.createBillingPlan(payload);

    try {
      const result = await request;
      setPlans(result.plans || []);
      setReadiness(result.readiness || null);
      if (payload.id) {
        setPlan(payload.id);
      }
      return result;
    } catch (error) {
      setApiError(error.message);
      throw error;
    }
  }

  async function removeBillingPlan(planId) {
    setApiError('');
    try {
      const result = await api.deleteBillingPlan(planId);
      const nextPlans = result.plans || [];
      setPlans(nextPlans);
      setReadiness(result.readiness || null);
      if (!nextPlans.some((item) => item.id === plan)) {
        setPlan(nextPlans[0]?.id || '');
      }
      return result;
    } catch (error) {
      setApiError(error.message);
      throw error;
    }
  }

  async function saveIntegrationSettings(payload) {
    setApiError('');
    try {
      const result = await api.updateIntegrationSettings(payload);
      setIntegrationSettings(result.integrationSettings || null);
      setReadiness(result.readiness || null);
      return result;
    } catch (error) {
      setApiError(error.message);
      throw error;
    }
  }

  async function refreshIntegrationOptions() {
    setApiError('');
    try {
      const result = await api.getIntegrationOptions();
      setIntegrationOptions(result);
      return result;
    } catch (error) {
      setApiError(error.message);
      throw error;
    }
  }

  function clearDraft() {
    setForm(defaultForm);
    setCampaign(emptyCampaign);
  }

  if (booting) {
    return (
      <div className="boot-screen">
        <Loader2 className="spin" size={24} />
        <strong>Loading SocialHub</strong>
      </div>
    );
  }

  if (!session) {
    return (
      <AuthScreen
        onSubmit={handleAuth}
        onGoogleAuth={handleGoogleAuth}
        googleAvailable={authProviders.google}
        error={apiError}
      />
    );
  }

  if (!session.onboarded) {
    return (
      <OnboardingWizard
        user={session}
        onComplete={finishOnboarding}
        error={apiError}
      />
    );
  }

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand-lockup" aria-label="SocialHub">
          <img className="brand-mark" src="/favicon.svg" alt="" />
          <div>
            <strong>SocialHub</strong>
            <span>SaaS Console</span>
          </div>
        </div>

        <nav className="nav-list" aria-label="Main navigation">
          <NavButton icon={Activity} id="dashboard" label="Command" activeView={activeView} setActiveView={setActiveView} />
          <NavButton icon={SquareStack} id="workflow" label="Workflow" activeView={activeView} setActiveView={setActiveView} />
          <NavButton icon={PlugZap} id="connections" label="Connections" activeView={activeView} setActiveView={setActiveView} />
          <NavButton icon={Wand2} id="factory" label="AI Factory" activeView={activeView} setActiveView={setActiveView} />
          <NavButton icon={ClipboardList} id="blueprint" label="Launch" activeView={activeView} setActiveView={setActiveView} />
        </nav>

        <div className="account-panel">
          <div className="account-icon">
            <Users size={18} />
          </div>
          <div>
            <strong>{tenant?.name || session.name}</strong>
            <span>{connectedCount} of 4 platforms linked</span>
          </div>
        </div>
      </aside>

      <main className="main-stage">
        <header className="topbar">
          <div>
            <p className="eyebrow">Production Console</p>
            <h1>{viewTitle(activeView)}</h1>
          </div>
          <div className="topbar-actions">
            <button className="secondary-action" type="button" onClick={logout}>
              <LogOut size={17} />
              Sign out
            </button>
            <button className="icon-button" type="button" aria-label="Refresh dashboard">
              <RefreshCcw size={18} />
            </button>
            <button className="primary-action" type="button" onClick={() => setActiveView('factory')}>
              <Rocket size={18} />
              Build campaign
            </button>
          </div>
        </header>

        {apiError && (
          <div className="alert-bar" role="alert">
            <CircleAlert size={18} />
            <span>{apiError}</span>
            <button className="icon-button small-icon" type="button" aria-label="Dismiss alert" onClick={() => setApiError('')}>
              <X size={15} />
            </button>
          </div>
        )}

        {activeView === 'dashboard' && (
          <Dashboard
            connectedCount={connectedCount}
            directPlatforms={directPlatforms}
            projectedCost={projectedCost}
            queue={queue}
            setActiveView={setActiveView}
          />
        )}

        {activeView === 'workflow' && <Workflow />}

        {activeView === 'connections' && <Connections platforms={platforms} togglePlatform={togglePlatform} />}

        {activeView === 'factory' && (
          <Factory
            form={form}
            updateForm={updateForm}
            selectedPlatforms={selectedPlatforms}
            toggleTarget={toggleTarget}
            campaign={campaign}
            isGenerating={isGenerating}
            generateCampaign={generateCampaign}
            addToQueue={addToQueue}
            clearDraft={clearDraft}
            isProcessing={isProcessing}
          />
        )}

        {activeView === 'blueprint' && (
          <Blueprint
            plan={plan}
            plans={plans}
            subscription={subscription}
            readiness={readiness}
            canManagePlans={session?.platformAdmin}
            integrationSettings={integrationSettings}
            integrationOptions={integrationOptions}
            setPlan={setPlan}
            checkout={checkout}
            saveBillingPlan={saveBillingPlan}
            removeBillingPlan={removeBillingPlan}
            saveIntegrationSettings={saveIntegrationSettings}
            refreshIntegrationOptions={refreshIntegrationOptions}
          />
        )}
      </main>
    </div>
  );
}

function NavButton({ icon: Icon, id, label, activeView, setActiveView }) {
  return (
    <button
      className={`nav-button ${activeView === id ? 'is-active' : ''}`}
      type="button"
      onClick={() => setActiveView(id)}
    >
      <Icon size={18} />
      <span>{label}</span>
    </button>
  );
}

function AuthScreen({ onSubmit, onGoogleAuth, googleAvailable, error }) {
  const [mode, setMode] = useState('register');
  const [form, setForm] = useState({ name: '', company: '', email: '', password: '' });
  const [busy, setBusy] = useState(false);
  const [googleBusy, setGoogleBusy] = useState(false);
  const isRegister = mode === 'register';

  function updateField(key, value) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function submit(event) {
    event.preventDefault();
    setBusy(true);
    try {
      await onSubmit({ ...form, mode });
    } finally {
      setBusy(false);
    }
  }

  async function handleGoogle() {
    setGoogleBusy(true);
    try {
      await onGoogleAuth();
    } finally {
      setGoogleBusy(false);
    }
  }

  return (
    <main className="auth-screen auth-screen-purple">
      <div className="auth-glow" />
      <section className="auth-panel auth-panel-purple">
        <div className="auth-logo-row">
          <div className="auth-logo-mark">
            <Sparkles size={22} />
          </div>
          <div>
            <strong>SocialHub</strong>
            <span>AI Content Platform</span>
          </div>
        </div>

        <div className="auth-heading">
          <h1>{isRegister ? 'Create your workspace' : 'Welcome back'}</h1>
          <p>{isRegister ? 'Start publishing smarter in minutes.' : 'Sign in to your workspace.'}</p>
        </div>

        {error && (
          <div className="alert-bar auth-alert" role="alert">
            <CircleAlert size={18} />
            <span>{error}</span>
          </div>
        )}

        {googleAvailable && (
          <>
            <button className="google-auth-btn" type="button" onClick={handleGoogle} disabled={googleBusy}>
              {googleBusy ? (
                <Loader2 className="spin" size={18} />
              ) : (
                <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
                  <path fill="#4285F4" d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 0 1-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615Z"/>
                  <path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18Z"/>
                  <path fill="#FBBC05" d="M3.964 10.706A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.706V4.962H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.038l3.007-2.332Z"/>
                  <path fill="#EA4335" d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.962L3.964 7.294C4.672 5.163 6.656 3.58 9 3.58Z"/>
                </svg>
              )}
              {isRegister ? 'Continue with Google' : 'Sign in with Google'}
            </button>
            <div className="auth-divider">
              <span>or continue with email</span>
            </div>
          </>
        )}

        <form className="auth-form" onSubmit={submit}>
          {isRegister && (
            <>
              <label>
                <span>Full name</span>
                <input value={form.name} onChange={(e) => updateField('name', e.target.value)} placeholder="Jane Smith" />
              </label>
              <label>
                <span>Company / Brand</span>
                <input value={form.company} onChange={(e) => updateField('company', e.target.value)} placeholder="Acme Media" />
              </label>
            </>
          )}
          <label>
            <span>Email address</span>
            <input type="email" value={form.email} onChange={(e) => updateField('email', e.target.value)} placeholder="jane@company.com" required />
          </label>
          <label>
            <span>Password</span>
            <input type="password" value={form.password} onChange={(e) => updateField('password', e.target.value)} placeholder="Min. 6 characters" required minLength={6} />
          </label>

          <button className="purple-primary-btn" type="submit" disabled={busy}>
            {busy ? <Loader2 className="spin" size={18} /> : isRegister ? <UserPlus size={18} /> : <KeyRound size={18} />}
            {busy ? 'Working…' : isRegister ? 'Create workspace' : 'Sign in'}
          </button>
        </form>

        <button className="auth-toggle-btn" type="button" onClick={() => setMode(isRegister ? 'login' : 'register')}>
          {isRegister ? 'Already have an account? Sign in' : "Don't have an account? Sign up"}
        </button>
      </section>
    </main>
  );
}

const ONBOARDING_ROLES = [
  { id: 'creator', label: 'Solo Creator', desc: 'Independent content creator building a personal brand' },
  { id: 'agency', label: 'Agency', desc: 'Running content for multiple clients' },
  { id: 'brand', label: 'Brand / Business', desc: 'Marketing for a company or product' },
  { id: 'team', label: 'Marketing Team', desc: 'Collaborative team managing social presence' },
];

const ONBOARDING_NICHES = [
  'E-commerce', 'Health & Wellness', 'Fashion & Beauty', 'Technology', 'Food & Lifestyle',
  'Entertainment', 'Real Estate', 'Finance', 'Education', 'Travel', 'Sports & Fitness', 'Other',
];

const ONBOARDING_TONES = [
  { id: 'professional', label: 'Professional', emoji: '💼' },
  { id: 'friendly', label: 'Friendly', emoji: '😊' },
  { id: 'bold', label: 'Bold & Direct', emoji: '⚡' },
  { id: 'playful', label: 'Playful', emoji: '🎉' },
  { id: 'educational', label: 'Educational', emoji: '📚' },
  { id: 'inspirational', label: 'Inspirational', emoji: '✨' },
];

function OnboardingWizard({ user, onComplete, error }) {
  const [step, setStep] = useState(0);
  const [direction, setDirection] = useState(1);
  const [animating, setAnimating] = useState(false);
  const [answers, setAnswers] = useState({
    role: '',
    niche: '',
    platforms: [],
    company: user?.name || '',
    audience: '',
    voice: '',
    offer: '',
  });
  const [submitting, setSubmitting] = useState(false);

  const TOTAL_STEPS = 5;

  function setAnswer(key, value) {
    setAnswers((prev) => ({ ...prev, [key]: value }));
  }

  function togglePlatform(id) {
    setAnswers((prev) => ({
      ...prev,
      platforms: prev.platforms.includes(id)
        ? prev.platforms.filter((p) => p !== id)
        : [...prev.platforms, id],
    }));
  }

  function goTo(next) {
    if (animating) return;
    setDirection(next > step ? 1 : -1);
    setAnimating(true);
    setTimeout(() => {
      setStep(next);
      setAnimating(false);
    }, 220);
  }

  async function finish() {
    setSubmitting(true);
    try {
      await onComplete({
        role: answers.role,
        niche: answers.niche,
        company: answers.company,
        audience: answers.audience,
        voice: answers.voice,
        offer: answers.offer,
      });
    } finally {
      setSubmitting(false);
    }
  }

  const progressPct = Math.round((step / (TOTAL_STEPS - 1)) * 100);

  return (
    <div className="onboard-screen">
      <div className="onboard-glow" />
      <div className="onboard-panel">
        {step < TOTAL_STEPS - 1 && (
          <div className="onboard-progress">
            <div className="onboard-progress-bar">
              <div className="onboard-progress-fill" style={{ width: `${progressPct}%` }} />
            </div>
            <span className="onboard-step-label">{step + 1} of {TOTAL_STEPS - 1}</span>
          </div>
        )}

        <div className={`onboard-step ${animating ? (direction > 0 ? 'slide-out-left' : 'slide-out-right') : 'slide-in'}`}>

          {step === 0 && (
            <div className="onboard-body">
              <div className="onboard-icon-badge"><Users size={28} /></div>
              <h2>What best describes you?</h2>
              <p>Help us tailor your workspace for the way you work.</p>
              <div className="role-grid">
                {ONBOARDING_ROLES.map((r) => (
                  <button
                    key={r.id}
                    className={`role-card ${answers.role === r.id ? 'is-selected' : ''}`}
                    type="button"
                    onClick={() => setAnswer('role', r.id)}
                  >
                    <strong>{r.label}</strong>
                    <span>{r.desc}</span>
                  </button>
                ))}
              </div>
              <div className="onboard-actions">
                <button className="purple-primary-btn" type="button" onClick={() => goTo(1)} disabled={!answers.role}>
                  Continue <ArrowRight size={17} />
                </button>
              </div>
            </div>
          )}

          {step === 1 && (
            <div className="onboard-body">
              <div className="onboard-icon-badge"><Sparkles size={28} /></div>
              <h2>What's your primary niche?</h2>
              <p>Your AI content will be tuned to your industry.</p>
              <div className="niche-grid">
                {ONBOARDING_NICHES.map((n) => (
                  <button
                    key={n}
                    className={`niche-chip ${answers.niche === n ? 'is-selected' : ''}`}
                    type="button"
                    onClick={() => setAnswer('niche', n)}
                  >
                    {n}
                  </button>
                ))}
              </div>
              <div className="onboard-actions">
                <button className="onboard-back-btn" type="button" onClick={() => goTo(0)}>Back</button>
                <button className="purple-primary-btn" type="button" onClick={() => goTo(2)} disabled={!answers.niche}>
                  Continue <ArrowRight size={17} />
                </button>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="onboard-body">
              <div className="onboard-icon-badge"><PlugZap size={28} /></div>
              <h2>Which platforms do you publish on?</h2>
              <p>Connect them later — just let us know what you use.</p>
              <div className="platform-pick-grid">
                {platformSeed.map((p) => (
                  <button
                    key={p.id}
                    className={`platform-pick-card ${answers.platforms.includes(p.id) ? 'is-selected' : ''}`}
                    type="button"
                    onClick={() => togglePlatform(p.id)}
                  >
                    <span className="platform-dot" style={{ background: p.color }} />
                    <strong>{p.name}</strong>
                    {answers.platforms.includes(p.id) && <Check size={15} className="pick-check" />}
                  </button>
                ))}
              </div>
              <div className="onboard-actions">
                <button className="onboard-back-btn" type="button" onClick={() => goTo(1)}>Back</button>
                <button className="purple-primary-btn" type="button" onClick={() => goTo(3)}>
                  Continue <ArrowRight size={17} />
                </button>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="onboard-body">
              <div className="onboard-icon-badge"><Wand2 size={28} /></div>
              <h2>Tell us about your brand</h2>
              <p>This powers your AI content — fill in what you know.</p>
              <div className="onboard-form">
                <label>
                  <span>Brand / Company name</span>
                  <input value={answers.company} onChange={(e) => setAnswer('company', e.target.value)} placeholder="e.g. Acme Media" />
                </label>
                <label>
                  <span>Target audience</span>
                  <input value={answers.audience} onChange={(e) => setAnswer('audience', e.target.value)} placeholder="e.g. Nigerian entrepreneurs aged 25–40" />
                </label>
                <label>
                  <span>What are you selling or promoting?</span>
                  <input value={answers.offer} onChange={(e) => setAnswer('offer', e.target.value)} placeholder="e.g. Online fitness coaching" />
                </label>
                <div>
                  <span className="onboard-form-label">Tone of voice</span>
                  <div className="tone-grid">
                    {ONBOARDING_TONES.map((t) => (
                      <button
                        key={t.id}
                        className={`tone-chip ${answers.voice === t.id ? 'is-selected' : ''}`}
                        type="button"
                        onClick={() => setAnswer('voice', t.id)}
                      >
                        <span>{t.emoji}</span>
                        <span>{t.label}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
              <div className="onboard-actions">
                <button className="onboard-back-btn" type="button" onClick={() => goTo(2)}>Back</button>
                <button className="purple-primary-btn" type="button" onClick={() => goTo(4)}>
                  Continue <ArrowRight size={17} />
                </button>
              </div>
            </div>
          )}

          {step === 4 && (
            <div className="onboard-body onboard-done">
              <div className="done-burst">
                <Rocket size={42} />
              </div>
              <h2>You're all set, {user?.name?.split(' ')[0] || 'there'}!</h2>
              <p>Your workspace is configured. Time to create your first AI campaign.</p>
              <div className="done-summary">
                {answers.role && <span className="done-tag">{ONBOARDING_ROLES.find((r) => r.id === answers.role)?.label}</span>}
                {answers.niche && <span className="done-tag">{answers.niche}</span>}
                {answers.platforms.length > 0 && <span className="done-tag">{answers.platforms.length} platform{answers.platforms.length > 1 ? 's' : ''}</span>}
              </div>
              {error && (
                <div className="alert-bar auth-alert" role="alert">
                  <CircleAlert size={18} />
                  <span>{error}</span>
                </div>
              )}
              <div className="onboard-actions onboard-actions-center">
                <button className="purple-primary-btn large-purple-btn" type="button" onClick={finish} disabled={submitting}>
                  {submitting ? <Loader2 className="spin" size={18} /> : <Rocket size={18} />}
                  {submitting ? 'Setting up…' : 'Launch my workspace'}
                </button>
                <button className="onboard-back-btn" type="button" onClick={() => goTo(3)}>Back</button>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}

function Dashboard({ connectedCount, directPlatforms, projectedCost, queue, setActiveView }) {
  return (
    <section className="screen-grid dashboard-grid">
      <div className="metric-card">
        <div className="metric-head">
          <Link2 size={18} />
          <span>Connected</span>
        </div>
        <strong>{connectedCount}/4</strong>
        <p>OAuth targets prepared for client accounts.</p>
      </div>
      <div className="metric-card">
        <div className="metric-head">
          <Send size={18} />
          <span>Direct APIs</span>
        </div>
        <strong>{directPlatforms}</strong>
        <p>YouTube, Meta, and approved TikTok publishing routes.</p>
      </div>
      <div className="metric-card">
        <div className="metric-head">
          <BadgeDollarSign size={18} />
          <span>Starter price</span>
        </div>
        <strong>{projectedCost || '—'}</strong>
        <p>Base monthly subscription target for early clients.</p>
      </div>

      <section className="wide-panel execution-panel">
        <div className="section-title-row">
          <div>
            <p className="eyebrow">Operating Model</p>
            <h2>Client content pipeline</h2>
          </div>
          <button className="secondary-action" type="button" onClick={() => setActiveView('workflow')}>
            <SquareStack size={17} />
            Flow
          </button>
        </div>
        <div className="pipeline-strip">
          {['Pay', 'Connect', 'Generate', 'Render', 'Approve', 'Publish'].map((label, index) => (
            <div className="pipeline-step" key={label}>
              <span>{index + 1}</span>
              <strong>{label}</strong>
              {index < 5 && <ChevronRight size={17} />}
            </div>
          ))}
        </div>
      </section>

      <section className="queue-panel">
        <div className="section-title-row">
          <div>
            <p className="eyebrow">Scheduler</p>
            <h2>Publishing queue</h2>
          </div>
          <button className="secondary-action" type="button" onClick={() => setActiveView('factory')}>
            <Wand2 size={17} />
            New
          </button>
        </div>
        <div className="queue-list">
          {queue.length ? (
            queue.map((item) => (
              <article className="queue-item" key={item.id}>
                <div>
                  <strong>{item.title}</strong>
                  <span>{item.channel} · {item.date} · {item.time}</span>
                </div>
                <StatusPill label={item.status} />
                <div className="progress-bar" aria-label={`${item.progress}% ready`}>
                  <span style={{ width: `${item.progress}%` }} />
                </div>
              </article>
            ))
          ) : (
            <div className="empty-state">
              <CalendarClock size={22} />
              <strong>No scheduled campaigns yet</strong>
              <span>Create and render a campaign before scheduling live publishing jobs.</span>
            </div>
          )}
        </div>
      </section>

      <section className="approval-panel">
        <div className="section-title-row">
          <div>
            <p className="eyebrow">Risk Board</p>
            <h2>Launch blockers</h2>
          </div>
        </div>
        <div className="risk-list">
          <RiskItem icon={ShieldCheck} label="Google verification" value="Required before public YouTube uploads" />
          <RiskItem icon={LockKeyhole} label="Meta app review" value="Required for Instagram and Facebook publishing" />
          <RiskItem icon={CircleAlert} label="TikTok approval" value="Direct post needs approval; inbox flow is fallback" />
        </div>
      </section>
    </section>
  );
}

function Workflow() {
  const nodes = [
    { icon: CreditCard, title: 'Subscribe', copy: 'Paystack creates tenant, plan, and usage limits.' },
    { icon: KeyRound, title: 'Authorize', copy: 'OAuth stores encrypted refresh tokens per platform.' },
    { icon: Sparkles, title: 'Generate', copy: 'Claude creates scripts, captions, titles, and hashtags.' },
    { icon: Mic2, title: 'Voice', copy: 'ElevenLabs turns approved scripts into voiceover assets.' },
    { icon: Film, title: 'Render', copy: 'Renderer builds vertical video variants for each channel.' },
    { icon: CalendarClock, title: 'Schedule', copy: 'Queue selects platform-specific timing and metadata.' },
    { icon: UploadCloud, title: 'Publish', copy: 'Platform APIs publish or request final TikTok approval.' },
  ];

  return (
    <section className="workflow-screen">
      <div className="flow-lane">
        {nodes.map((node, index) => {
          const Icon = node.icon;
          return (
            <div className="flow-node" key={node.title}>
              <div className="flow-icon">
                <Icon size={22} />
              </div>
              <div>
                <span>0{index + 1}</span>
                <strong>{node.title}</strong>
                <p>{node.copy}</p>
              </div>
              {index < nodes.length - 1 && <ArrowRight className="flow-arrow" size={20} />}
            </div>
          );
        })}
      </div>

      <div className="two-column">
        <section className="plain-panel">
          <p className="eyebrow">Data Flow</p>
          <h2>Production architecture</h2>
          <div className="architecture-stack">
            <StackRow left="React app" right="Client dashboard, approval queue, analytics" />
            <StackRow left="Node API" right="Auth, billing, campaigns, webhooks, job orchestration" />
            <StackRow left="PostgreSQL" right="Tenants, users, brands, campaigns, schedules" />
            <StackRow left="Redis queue" right="Voice jobs, video jobs, publish retries" />
            <StackRow left="Storage" right="Raw assets, rendered videos, thumbnails" />
          </div>
        </section>
        <section className="plain-panel accent-panel">
          <p className="eyebrow">Client Reality</p>
          <h2>Automation rules</h2>
          <div className="rules-list">
            <Rule label="YouTube" value="Direct upload and scheduled publish after Google approval." />
            <Rule label="Instagram" value="Business or Creator account required through Meta." />
            <Rule label="Facebook" value="Page publishing with approved Meta permissions." />
            <Rule label="TikTok" value="Direct post when approved, manual completion fallback otherwise." />
          </div>
        </section>
      </div>
    </section>
  );
}

function Connections({ platforms, togglePlatform }) {
  return (
    <section className="connections-screen">
      <div className="section-title-row">
        <div>
          <p className="eyebrow">OAuth Center</p>
          <h2>Client platform links</h2>
        </div>
        <StatusPill label="OAuth required" />
      </div>

      <div className="platform-grid">
        {platforms.map((platform) => (
          <article className="platform-card" key={platform.id}>
            <div className="platform-head">
              <span className="platform-dot" style={{ background: platform.color }} />
              <div>
                <strong>{platform.name}</strong>
                {platform.handle && <span>{platform.handle}</span>}
              </div>
            </div>
            <p>{platform.capability}</p>
            <div className="platform-meta">
              <MetaLine label="API" value={platform.api} />
              <MetaLine label="Mode" value={platform.automation} />
              <MetaLine label="Risk" value={platform.risk} />
            </div>
            <button
              className={platform.connected ? 'connected-action' : 'primary-action full-width'}
              type="button"
              onClick={() => togglePlatform(platform.id)}
            >
              {platform.connected ? <Check size={18} /> : <PlugZap size={18} />}
              {platform.connected ? 'Connected' : 'Connect'}
            </button>
          </article>
        ))}
      </div>
    </section>
  );
}

function Factory({
  form,
  updateForm,
  selectedPlatforms,
  toggleTarget,
  campaign,
  isGenerating,
  generateCampaign,
  addToQueue,
  clearDraft,
  isProcessing,
}) {
  return (
    <section className="factory-screen">
      <form className="generator-panel" onSubmit={(event) => event.preventDefault()}>
        <div className="section-title-row">
          <div>
            <p className="eyebrow">AI Factory</p>
            <h2>Campaign builder</h2>
          </div>
          <button className="icon-button" type="button" onClick={clearDraft} aria-label="Reset campaign">
            <X size={18} />
          </button>
        </div>

        <label>
          <span>Topic</span>
          <textarea value={form.topic} onChange={(event) => updateForm('topic', event.target.value)} rows={4} />
        </label>
        <div className="form-grid">
          <label>
            <span>Audience</span>
            <input value={form.audience} onChange={(event) => updateForm('audience', event.target.value)} />
          </label>
          <label>
            <span>Tone</span>
            <input value={form.tone} onChange={(event) => updateForm('tone', event.target.value)} />
          </label>
          <label>
            <span>Offer</span>
            <input value={form.offer} onChange={(event) => updateForm('offer', event.target.value)} />
          </label>
          <label>
            <span>Format</span>
            <select value={form.format} onChange={(event) => updateForm('format', event.target.value)}>
              <option>short-form video</option>
              <option>carousel</option>
              <option>long-form video</option>
              <option>story post</option>
            </select>
          </label>
        </div>

        <div className="target-row" role="group" aria-label="Target platforms">
          {platformSeed.map((platform) => (
            <button
              className={`target-chip ${selectedPlatforms.includes(platform.id) ? 'is-selected' : ''}`}
              type="button"
              key={platform.id}
              onClick={() => toggleTarget(platform.id)}
            >
              <span className="platform-dot" style={{ background: platform.color }} />
              {platform.name}
            </button>
          ))}
        </div>

        <button className="primary-action large-action" type="button" onClick={generateCampaign} disabled={isGenerating}>
          {isGenerating ? <Loader2 className="spin" size={18} /> : <Wand2 size={18} />}
          {isGenerating ? 'Generating' : 'Generate campaign'}
        </button>
      </form>

      <section className="campaign-output">
        <div className="section-title-row">
          <div>
            <p className="eyebrow">Generated Draft</p>
            <h2>{campaign.title}</h2>
          </div>
          <button className="secondary-action" type="button" onClick={addToQueue} disabled={isProcessing}>
            {isProcessing ? <Loader2 className="spin" size={17} /> : <CalendarClock size={17} />}
            {isProcessing ? 'Building' : 'Queue'}
          </button>
        </div>

        <div className="script-box">
          <h3>Script</h3>
          {campaign.script.length ? (
            <ol>
              {campaign.script.map((line) => (
                <li key={line}>{line}</li>
              ))}
            </ol>
          ) : (
            <p className="muted-copy">Generate a campaign with your live Claude API key to create the script.</p>
          )}
        </div>

        <div className="caption-grid">
          {campaign.captions.length ? (
            campaign.captions.map((caption) => (
              <article className="caption-card" key={caption.platform}>
                <div className="caption-head">
                  <strong>{caption.platform}</strong>
                  <StatusPill label={caption.mode} />
                </div>
                <p>{caption.text}</p>
                <span>{caption.hashtags}</span>
              </article>
            ))
          ) : (
            <div className="empty-state caption-empty">
              <FileText size={22} />
              <strong>No platform captions yet</strong>
              <span>Captions appear after generation completes.</span>
            </div>
          )}
        </div>

        <div className="asset-row">
          <Asset icon={FileText} label="Claude brief" state="Ready" />
          <Asset icon={Mic2} label="Voiceover" state="Queued" />
          <Asset icon={Film} label="Video render" state="Pending" />
          <Asset icon={UploadCloud} label="Publish job" state="Draft" />
        </div>
      </section>
    </section>
  );
}

function Blueprint({
  plan,
  plans,
  subscription,
  readiness,
  canManagePlans,
  integrationSettings,
  integrationOptions,
  setPlan,
  checkout,
  saveBillingPlan,
  removeBillingPlan,
  saveIntegrationSettings,
  refreshIntegrationOptions,
}) {
  const blankPlanForm = {
    id: '',
    name: '',
    priceMonthly: '',
    currency: 'NGN',
    campaignLimit: '',
    platformLimit: '4',
    paystackPlanCode: '',
  };
  const [planForm, setPlanForm] = useState(blankPlanForm);
  const [savingPlan, setSavingPlan] = useState(false);
  const [deletingPlanId, setDeletingPlanId] = useState('');
  const [settingsForm, setSettingsForm] = useState({
    anthropicModel: '',
    elevenLabsModel: 'eleven_multilingual_v2',
    elevenLabsVoiceId: '',
  });
  const [settingsDirty, setSettingsDirty] = useState(false);
  const [savingSettings, setSavingSettings] = useState(false);
  const [loadingOptions, setLoadingOptions] = useState(false);
  const visiblePlans = plans;

  const readinessPercent = readiness ? Math.round((readiness.completed / readiness.total) * 100) : 0;
  const readinessRows = (readiness?.checks || []).map((item) => ({
    id: item.id,
    label: item.label,
    weeks: item.ready ? 'Configured' : 'Needs setup',
    state: item.severity === 'launch' ? 'launch' : 'required',
    items: [item.detail],
  }));
  const selectedPlan = visiblePlans.find((item) => item.id === plan);
  const editingPlan = plans.find((item) => item.id === planForm.originalId);
  const claudeModelOptions = mergeSelectOptions(integrationOptions.claudeModels, settingsForm.anthropicModel);
  const elevenModelOptions = mergeSelectOptions(integrationOptions.elevenLabsModels, settingsForm.elevenLabsModel);
  const elevenVoiceOptions = mergeSelectOptions(integrationOptions.elevenLabsVoices, settingsForm.elevenLabsVoiceId);

  useEffect(() => {
    if (!integrationSettings || settingsDirty) return;
    setSettingsForm({
      anthropicModel: integrationSettings.anthropicModel || '',
      elevenLabsModel: integrationSettings.elevenLabsModel || 'eleven_multilingual_v2',
      elevenLabsVoiceId: integrationSettings.elevenLabsVoiceId || '',
    });
  }, [integrationSettings, settingsDirty]);

  useEffect(() => {
    if (!canManagePlans) return;
    if (
      integrationOptions.claudeModels.length ||
      integrationOptions.elevenLabsModels.length ||
      integrationOptions.elevenLabsVoices.length
    ) {
      return;
    }
    loadIntegrationOptions(true);
  }, [canManagePlans]);

  function updatePlanForm(key, value) {
    setPlanForm((current) => ({ ...current, [key]: value }));
  }

  function updateSettingsForm(key, value) {
    setSettingsDirty(true);
    setSettingsForm((current) => ({ ...current, [key]: value }));
  }

  function editPlan(item) {
    setPlanForm({
      originalId: item.id,
      id: item.id,
      name: item.name || '',
      priceMonthly: String(item.priceMonthly || ''),
      currency: item.currency || 'NGN',
      campaignLimit: String(item.campaignLimit || ''),
      platformLimit: String(item.platformLimit || 4),
      paystackPlanCode: item.paystackPlanCode || '',
    });
  }

  function resetPlanForm() {
    setPlanForm(blankPlanForm);
  }

  async function submitBillingPlan(event) {
    event.preventDefault();
    setSavingPlan(true);
    try {
      await saveBillingPlan(planForm);
      resetPlanForm();
    } finally {
      setSavingPlan(false);
    }
  }

  async function deletePlan(item) {
    setDeletingPlanId(item.id);
    try {
      await removeBillingPlan(item.id);
      if (planForm.originalId === item.id) resetPlanForm();
    } finally {
      setDeletingPlanId('');
    }
  }

  async function loadIntegrationOptions(silent = false) {
    setLoadingOptions(true);
    try {
      await refreshIntegrationOptions();
    } catch (error) {
      if (!silent) throw error;
    } finally {
      setLoadingOptions(false);
    }
  }

  async function submitIntegrationSettings(event) {
    event.preventDefault();
    setSavingSettings(true);
    try {
      await saveIntegrationSettings(settingsForm);
      setSettingsDirty(false);
    } finally {
      setSavingSettings(false);
    }
  }

  return (
    <section className="blueprint-screen">
      <div className="two-column">
        <section className="plain-panel">
          <p className="eyebrow">Launch Status</p>
          <h2>Production readiness</h2>
          <div className="readiness-summary">
            <strong>{readinessPercent}%</strong>
            <span>{readiness?.completed || 0} of {readiness?.total || 0} live requirements configured</span>
            <div className="progress-bar">
              <span style={{ width: `${readinessPercent}%` }} />
            </div>
          </div>
          <div className="phase-list">
            {readinessRows.map((phase) => (
              <article className="phase-item readiness-item" key={phase.id}>
                <div>
                  <strong>{phase.label}</strong>
                  <span>{phase.weeks} · {phase.state}</span>
                </div>
                <ul>
                  {phase.items.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </article>
            ))}
          </div>
        </section>

        <section className="plain-panel">
          <p className="eyebrow">Billing</p>
          <h2>Subscription plan</h2>
          <div className="pricing-toggle" role="group" aria-label="Pricing plan">
            {visiblePlans.map((item) => (
              <button className={plan === item.id ? 'is-selected' : ''} type="button" key={item.id} onClick={() => setPlan(item.id)}>
                {formatPrice(item)}
              </button>
            ))}
          </div>
          <button className="primary-action full-width" type="button" onClick={() => checkout(plan)}>
            <CreditCard size={18} />
            Activate {selectedPlan?.name || plan}
          </button>
          <div className="unit-economics">
            <Metric label="Current billing status" value={subscription?.status || 'trialing'} />
            <Metric label="Billing provider" value={subscription?.provider || 'paystack'} />
            <Metric label="Selected plan" value={selectedPlan?.name || plan} />
            <Metric label="Launch state" value={readiness?.launchReady ? 'Ready' : 'Needs configuration'} />
          </div>
        </section>
      </div>

      {canManagePlans && (
        <section className="api-panel billing-admin">
          <div className="section-title-row">
            <div>
              <p className="eyebrow">Admin Billing</p>
              <h2>Paystack plans</h2>
            </div>
            <StatusPill label={plans.length > 0 && plans.every((item) => item.paystackPlanCode) ? 'Plan codes ready' : 'Add plan codes'} />
          </div>

          <div className="billing-admin-grid">
            <form className="plan-form" onSubmit={submitBillingPlan}>
              <div className="form-grid">
                <label>
                  <span>Plan name</span>
                  <input value={planForm.name} onChange={(event) => updatePlanForm('name', event.target.value)} placeholder="Starter" required />
                </label>
                <label>
                  <span>Plan slug</span>
                  <input value={planForm.id} onChange={(event) => updatePlanForm('id', event.target.value)} placeholder="starter" disabled={Boolean(planForm.originalId)} required />
                </label>
                <label>
                  <span>Monthly price</span>
                  <input type="number" min="1" value={planForm.priceMonthly} onChange={(event) => updatePlanForm('priceMonthly', event.target.value)} placeholder="25000" required />
                </label>
                <label>
                  <span>Currency</span>
                  <input value={planForm.currency} onChange={(event) => updatePlanForm('currency', event.target.value)} placeholder="NGN" required />
                </label>
                <label>
                  <span>Campaign limit</span>
                  <input type="number" min="1" value={planForm.campaignLimit} onChange={(event) => updatePlanForm('campaignLimit', event.target.value)} placeholder="30" required />
                </label>
                <label>
                  <span>Platform limit</span>
                  <input type="number" min="1" value={planForm.platformLimit} onChange={(event) => updatePlanForm('platformLimit', event.target.value)} placeholder="4" required />
                </label>
              </div>
              <label>
                <span>Paystack plan code</span>
                <input value={planForm.paystackPlanCode} onChange={(event) => updatePlanForm('paystackPlanCode', event.target.value)} placeholder="PLN_xxxxxxxxxxxxxx" />
              </label>
              <div className="plan-form-actions">
                <button className="primary-action" type="submit" disabled={savingPlan}>
                  {savingPlan ? <Loader2 className="spin" size={17} /> : <Save size={17} />}
                  {editingPlan ? 'Save plan' : 'Add plan'}
                </button>
                {planForm.originalId && (
                  <button className="secondary-action" type="button" onClick={resetPlanForm}>
                    <Plus size={17} />
                    New plan
                  </button>
                )}
              </div>
            </form>

            <div className="plan-list">
              {plans.map((item) => (
                <article className="plan-item" key={item.id}>
                  <div>
                    <strong>{item.name}</strong>
                    <span>{formatPrice(item)} · {item.campaignLimit} campaigns · {item.paystackPlanCode || 'No Paystack code'}</span>
                  </div>
                  <div className="plan-actions">
                    <button className="icon-button" type="button" aria-label={`Edit ${item.name}`} onClick={() => editPlan(item)}>
                      <Pencil size={16} />
                    </button>
                    <button className="icon-button danger-button" type="button" aria-label={`Delete ${item.name}`} onClick={() => deletePlan(item)} disabled={deletingPlanId === item.id || plans.length <= 1}>
                      {deletingPlanId === item.id ? <Loader2 className="spin" size={16} /> : <Trash2 size={16} />}
                    </button>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>
      )}

      {canManagePlans && (
        <section className="api-panel billing-admin">
          <div className="section-title-row">
            <div>
              <p className="eyebrow">Admin AI Settings</p>
              <h2>Global generation defaults</h2>
            </div>
            <button className="secondary-action" type="button" onClick={() => loadIntegrationOptions()} disabled={loadingOptions}>
              {loadingOptions ? <Loader2 className="spin" size={17} /> : <RefreshCcw size={17} />}
              Refresh lists
            </button>
          </div>

          <form className="plan-form integration-form" onSubmit={submitIntegrationSettings}>
            <div className="form-grid">
              <label>
                <span>Claude model</span>
                <select value={settingsForm.anthropicModel} onChange={(event) => updateSettingsForm('anthropicModel', event.target.value)} required>
                  <option value="">Choose Claude model</option>
                  {claudeModelOptions.map((item) => (
                    <option value={item.id} key={item.id}>{item.name}</option>
                  ))}
                </select>
              </label>
              <label>
                <span>Manual Claude model</span>
                <input value={settingsForm.anthropicModel} onChange={(event) => updateSettingsForm('anthropicModel', event.target.value)} placeholder="Select or paste model ID" required />
              </label>
              <label>
                <span>ElevenLabs TTS model</span>
                <select value={settingsForm.elevenLabsModel} onChange={(event) => updateSettingsForm('elevenLabsModel', event.target.value)} required>
                  <option value="">Choose ElevenLabs model</option>
                  {elevenModelOptions.map((item) => (
                    <option value={item.id} key={item.id}>{item.name}</option>
                  ))}
                </select>
              </label>
              <label>
                <span>ElevenLabs voice</span>
                <select value={settingsForm.elevenLabsVoiceId} onChange={(event) => updateSettingsForm('elevenLabsVoiceId', event.target.value)}>
                  <option value="">Choose voice from API</option>
                  {elevenVoiceOptions.map((item) => (
                    <option value={item.id} key={item.id}>{item.name}</option>
                  ))}
                </select>
              </label>
              <label>
                <span>Manual voice ID</span>
                <input value={settingsForm.elevenLabsVoiceId} onChange={(event) => updateSettingsForm('elevenLabsVoiceId', event.target.value)} placeholder="JBFqnCBsd6RMkjVDRZzb" required />
              </label>
            </div>

            {integrationOptions.errors?.length > 0 && (
              <div className="settings-warning">
                {integrationOptions.errors.map((item) => (
                  <span key={item.source}>{item.source}: provider list unavailable</span>
                ))}
              </div>
            )}

            <div className="plan-form-actions">
              <button className="primary-action" type="submit" disabled={savingSettings}>
                {savingSettings ? <Loader2 className="spin" size={17} /> : <Save size={17} />}
                Save global defaults
              </button>
              <span className="settings-note">
                Applies to new AI and voice jobs immediately.
              </span>
            </div>
          </form>
        </section>
      )}

      <section className="api-panel">
        <div className="section-title-row">
          <div>
            <p className="eyebrow">Live Integrations</p>
            <h2>Configured services</h2>
          </div>
          <StatusPill label={readiness?.requiredReady ? 'Core ready' : 'Setup required'} />
        </div>
        <div className="api-list">
          {serviceMap.map((row) => {
            const check = readiness?.checks?.find((c) => c.id === row.checkId);
            const pct = check ? (check.ready ? 100 : 0) : null;
            return (
              <article className="api-row" key={row.label}>
                <div>
                  <strong>{row.label}</strong>
                  <span>{row.owner} · {row.use}</span>
                </div>
                <div className="readiness">
                  <span>{pct === null ? '—' : `${pct}%`}</span>
                  <div className="progress-bar">
                    <span style={{ width: `${pct ?? 0}%` }} />
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      </section>
    </section>
  );
}

function StatusPill({ label }) {
  return <span className="status-pill">{label}</span>;
}

function mergeSelectOptions(options = [], currentValue = '') {
  const seen = new Set();
  const normalized = options
    .filter((item) => item?.id)
    .map((item) => ({ id: item.id, name: item.name || item.id }))
    .filter((item) => {
      if (seen.has(item.id)) return false;
      seen.add(item.id);
      return true;
    });

  if (currentValue && !seen.has(currentValue)) {
    normalized.unshift({ id: currentValue, name: currentValue });
  }

  return normalized;
}

function RiskItem({ icon: Icon, label, value }) {
  return (
    <div className="risk-item">
      <Icon size={18} />
      <div>
        <strong>{label}</strong>
        <span>{value}</span>
      </div>
    </div>
  );
}

function StackRow({ left, right }) {
  return (
    <div className="stack-row">
      <strong>{left}</strong>
      <span>{right}</span>
    </div>
  );
}

function Rule({ label, value }) {
  return (
    <div className="rule-row">
      <strong>{label}</strong>
      <span>{value}</span>
    </div>
  );
}

function MetaLine({ label, value }) {
  return (
    <div className="meta-line">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function Asset({ icon: Icon, label, state }) {
  return (
    <div className="asset-pill">
      <Icon size={17} />
      <div>
        <strong>{label}</strong>
        <span>{state}</span>
      </div>
    </div>
  );
}

function Metric({ label, value }) {
  return (
    <div className="metric-line">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function mergePlatforms(serverPlatforms) {
  return platformSeed.map((seed) => {
    const serverPlatform = serverPlatforms.find((item) => item.id === seed.id);
    const connected = Boolean(serverPlatform?.connected);
    return {
      ...seed,
      connected,
      handle: serverPlatform?.handle || seed.handle,
      status: connected ? 'Connected' : seed.status,
      connectedAt: serverPlatform?.connectedAt || null,
    };
  });
}

function queueFromData(campaigns, publishJobs) {
  const jobRows = jobsToQueue(publishJobs, campaigns);
  const campaignRows = campaigns
    .filter((campaign) => !publishJobs.some((job) => job.campaignId === campaign.id))
    .map((campaign) => {
      const created = new Date(campaign.createdAt);
      return {
        id: campaign.id,
        title: campaign.title,
        channel: 'Draft campaign',
        date: created.toISOString().slice(0, 10),
        time: created.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        status: campaign.status,
        progress: statusProgress(campaign.status),
      };
    });

  return [...jobRows, ...campaignRows];
}

function jobsToQueue(jobs, campaigns) {
  return jobs.map((job) => {
    const campaign = campaigns.find((item) => item.id === job.campaignId);
    const platform = platformSeed.find((item) => item.id === job.platformId);
    const publishDate = new Date(job.publishAt || job.createdAt);
    return {
      id: job.id,
      title: campaign?.title || 'Scheduled campaign',
      channel: platform?.name || job.platformId,
      date: publishDate.toISOString().slice(0, 10),
      time: publishDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      status: prettyStatus(job.status),
      progress: statusProgress(job.status),
    };
  });
}

function prettyStatus(status = '') {
  return status
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function statusProgress(status = '') {
  if (status.includes('published')) return 100;
  if (status.includes('scheduled')) return 78;
  if (status.includes('approval')) return 56;
  if (status.includes('ready')) return 68;
  if (status.includes('blocked')) return 20;
  return 42;
}

function buildCampaign(source, platformIds) {
  const platforms = platformSeed.filter((platform) => platformIds.includes(platform.id));
  const topic = source.topic || defaultForm.topic;
  const audience = source.audience || defaultForm.audience;
  const tone = source.tone || defaultForm.tone;

  return {
    title: topic.length > 64 ? `${topic.slice(0, 64)}...` : topic,
    script: [
      `Hook: ${audience} waste time making separate posts for every platform.`,
      `Problem: one idea usually needs a different title, caption, aspect, and approval path.`,
      `Solution: turn one approved idea into platform-ready video, voiceover, captions, and schedule jobs.`,
      `Proof: YouTube and Meta can publish directly; TikTok uses direct post when approved or a phone approval fallback.`,
      `CTA: invite the viewer to start with one daily post package.`,
    ],
    captions: platforms.map((platform) => ({
      platform: platform.name,
      mode: platform.id === 'tiktok' ? 'Hybrid' : 'Auto',
      text: `${tone} ${platform.name} caption for ${audience}: ${topic}`,
      hashtags:
        platform.id === 'youtube'
          ? '#Shorts #BusinessGrowth #ContentSystem'
          : platform.id === 'tiktok'
            ? '#SmallBusiness #AITools #DailyContent'
            : '#SocialMediaMarketing #Entrepreneurship #ContentCreation',
    })),
  };
}

function viewTitle(view) {
  const titles = {
    dashboard: 'Command center',
    workflow: 'Workflow map',
    connections: 'Connection center',
    factory: 'AI content factory',
    blueprint: 'Launch readiness',
  };
  return titles[view] || 'Command center';
}

export default App;
