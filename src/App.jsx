import React, { useEffect, useMemo, useRef, useState } from 'react';
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

function useReveal(threshold = 0.14) {
  const ref = useRef(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setVisible(true); observer.disconnect(); } },
      { threshold },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [threshold]);
  return [ref, visible];
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
    }, 30000);
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
      if (error.message?.includes('401') || error.message?.toLowerCase().includes('unauthorized')) {
        logout();
        return;
      }
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

const LANDING_FEATURES = [
  { icon: Wand2,           title: 'AI Script Generation',   desc: 'Claude writes your hooks, scripts, captions and hashtags — tuned to your brand voice.' },
  { icon: Mic2,            title: 'Voiceover in Seconds',   desc: 'ElevenLabs converts your script into a studio-quality voiceover instantly.' },
  { icon: Film,            title: 'Auto Video Renders',     desc: 'Your content gets assembled into polished vertical video, ready to go live.' },
  { icon: UploadCloud,     title: 'Direct Publishing',      desc: 'One click sends your video to YouTube, Instagram, Facebook and TikTok.' },
  { icon: Users,           title: 'Multi-Client Workspace', desc: 'Manage unlimited brands and clients from a single consolidated dashboard.' },
  { icon: BadgeDollarSign, title: 'Built-in Billing',       desc: 'Paystack subscriptions, usage limits and invoicing — all wired in from day one.' },
];

const LANDING_STATS = [
  { value: '10×', label: 'Faster content creation' },
  { value: '4',   label: 'Platforms in one workflow' },
  { value: '100%', label: 'AI-generated scripts' },
];

const MARQUEE_ITEMS = [
  { label: 'Claude AI',      color: '#d97706' },
  { label: 'ElevenLabs',     color: '#a855f7' },
  { label: 'YouTube',        color: '#ff0000' },
  { label: 'Instagram',      color: '#e1306c' },
  { label: 'Facebook',       color: '#1877f2' },
  { label: 'TikTok',         color: '#ee1d52' },
  { label: 'Meta API',       color: '#0082fb' },
];

const HERO_WORDS = ['Create.', 'Voice.', 'Render.', 'Publish.'];

const OB_USES = [
  { id: 'creator',  icon: Sparkles, label: 'Content Creator',  desc: 'Building my personal brand or channel' },
  { id: 'agency',   icon: Users,    label: 'Social Agency',     desc: 'Managing content for multiple clients' },
  { id: 'brand',    icon: Rocket,   label: 'Brand / Business',  desc: 'Marketing a company, product or service' },
  { id: 'explore',  icon: Play,     label: 'Just Exploring',    desc: 'Curious what AI content can do for me' },
];

const OB_FREQ = [
  { id: 'daily',   label: 'Every day',      desc: 'High-volume publishing' },
  { id: '3x',      label: '3× per week',    desc: 'Consistent schedule' },
  { id: 'weekly',  label: 'Once a week',    desc: 'Focused, polished drops' },
  { id: 'new',     label: 'Just starting',  desc: 'Finding my rhythm' },
];

const OB_TONES = [
  { id: 'professional',  emoji: '💼', label: 'Professional' },
  { id: 'friendly',      emoji: '😊', label: 'Friendly'      },
  { id: 'bold',          emoji: '⚡', label: 'Bold & Direct' },
  { id: 'playful',       emoji: '🎉', label: 'Playful'       },
  { id: 'educational',   emoji: '📚', label: 'Educational'   },
  { id: 'inspirational', emoji: '✨', label: 'Inspirational' },
];

const SHOWCASE_CARDS = [
  { platform: 'YouTube Shorts', color: '#ff0000', bg: 'linear-gradient(160deg,#180010,#3d0000)', title: '5 AI Business Hacks That 3× Your Revenue',        views: '124K views', likes: '8.2K', dur: '0:58' },
  { platform: 'TikTok',         color: '#ee1d52', bg: 'linear-gradient(160deg,#0a0a1a,#1a0a1a)', title: 'I built a brand with just AI tools 🚀',             views: '2.1M views', likes: '340K', dur: '0:32' },
  { platform: 'Instagram Reel', color: '#e1306c', bg: 'linear-gradient(160deg,#1a0c1a,#0c0c2d)', title: 'Morning routine that changed my life ✨',            views: '340K plays', likes: '45K',  dur: '0:45' },
  { platform: 'Facebook',       color: '#1877f2', bg: 'linear-gradient(160deg,#020c1f,#071535)', title: 'AI content strategy for small businesses',          views:  '56K views', likes: '3.1K', dur: '1:20' },
  { platform: 'YouTube Shorts', color: '#ff0000', bg: 'linear-gradient(160deg,#1a0533,#3d000f)', title: 'Product launch strategy — zero ad spend',           views:  '78K views', likes: '5.4K', dur: '0:51' },
  { platform: 'TikTok',         color: '#ee1d52', bg: 'linear-gradient(160deg,#0d0a1a,#1a0a2d)', title: 'Day in the life of an AI content creator',           views: '890K views', likes: '112K', dur: '0:28' },
  { platform: 'Instagram Reel', color: '#e1306c', bg: 'linear-gradient(160deg,#1a0c35,#2d0c1a)', title: 'Transform your brand voice with AI 🎯',              views: '185K plays', likes: '22K',  dur: '0:39' },
  { platform: 'YouTube Shorts', color: '#ff0000', bg: 'linear-gradient(160deg,#0c1535,#2d1a53)', title: '3-step system for viral short-form video',           views: '290K views', likes: '18K',  dur: '1:02' },
];

const PLATFORM_TILES = [
  {
    id: 'youtube', name: 'YouTube', color: '#ff0000', bg: 'linear-gradient(135deg,#180010 0%,#2d0000 100%)',
    format: 'Shorts & Long-form', reach: '2.7B users',
    preview: { title: '5 AI Hacks That Grew My Brand 10×', channel: 'YourBrand', views: '124K', likes: '8.2K', duration: '0:58' },
  },
  {
    id: 'tiktok', name: 'TikTok', color: '#ee1d52', bg: 'linear-gradient(135deg,#0a0a1a 0%,#1a0a1a 100%)',
    format: 'Short Videos', reach: '1.5B users',
    preview: { title: 'How I built a 6-figure brand with AI 🚀', channel: '@yourbrand', views: '2.1M', likes: '340K', duration: '0:28' },
  },
  {
    id: 'instagram', name: 'Instagram', color: '#e1306c', bg: 'linear-gradient(135deg,#1a0c1a 0%,#0c0c2d 100%)',
    format: 'Reels & Posts', reach: '2B users',
    preview: { title: 'Morning routine that 10×\'d my energy ✨', channel: '@yourbrand', views: '340K', likes: '45K', duration: '0:45' },
  },
  {
    id: 'facebook', name: 'Facebook', color: '#1877f2', bg: 'linear-gradient(135deg,#020c1f 0%,#071535 100%)',
    format: 'Videos & Reels', reach: '3B users',
    preview: { title: 'AI content strategy every brand needs', channel: 'Your Page', views: '56K', likes: '3.1K', duration: '1:20' },
  },
];

const PRICING_PLANS_LANDING = [
  {
    id: 'starter', name: 'Starter', price: '₦25,000', period: '/mo',
    desc: 'Perfect for solo creators and small brands',
    features: ['30 campaigns / month', '4 platform connections', 'Claude AI scripts & captions', 'ElevenLabs voiceovers', 'Auto video rendering', 'Direct multi-platform publish'],
    highlight: false,
  },
  {
    id: 'growth', name: 'Growth', price: '₦65,000', period: '/mo',
    desc: 'For brands scaling their content output fast',
    features: ['120 campaigns / month', '4 platform connections', 'Claude AI scripts & captions', 'ElevenLabs voiceovers', 'Priority video rendering', 'Direct multi-platform publish', 'Brand voice profiles', 'Campaign analytics'],
    highlight: true,
  },
  {
    id: 'agency', name: 'Agency', price: '₦150,000', period: '/mo',
    desc: 'Run content operations for multiple clients',
    features: ['400 campaigns / month', '4 platform connections', 'Claude AI scripts & captions', 'ElevenLabs voiceovers', 'Fastest priority rendering', 'Direct multi-platform publish', 'Multi-client workspaces', 'Dedicated support', 'White-label ready'],
    highlight: false,
  },
];

/* ─── Google SVG icon ─────────────────────────────────────────────── */
function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
      <path fill="#4285F4" d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 0 1-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615Z"/>
      <path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18Z"/>
      <path fill="#FBBC05" d="M3.964 10.706A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.706V4.962H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.038l3.007-2.332Z"/>
      <path fill="#EA4335" d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.962L3.964 7.294C4.672 5.163 6.656 3.58 9 3.58Z"/>
    </svg>
  );
}

/* ─── Auth modal ──────────────────────────────────────────────────── */
function AuthModal({ mode, onClose, onSubmit, onGoogleAuth, googleAvailable, error, onSwitchMode }) {
  const [authStep, setAuthStep] = useState(0);
  const [email, setEmail] = useState('');
  const [form, setForm] = useState({ name: '', company: '', password: '' });
  const [busy, setBusy] = useState(false);
  const [googleBusy, setGoogleBusy] = useState(false);
  const isRegister = mode === 'register';

  function advance(e) {
    e.preventDefault();
    if (!email.trim()) return;
    setAuthStep(1);
  }

  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    try {
      await onSubmit({ email, ...form, mode });
    } finally {
      setBusy(false);
    }
  }

  async function handleGoogle() {
    setGoogleBusy(true);
    try { await onGoogleAuth(); } finally { setGoogleBusy(false); }
  }

  return (
    <div className="auth-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="auth-modal">
        <button className="auth-modal-close" onClick={onClose} aria-label="Close"><X size={18} /></button>

        <div className="auth-modal-logo">
          <div className="auth-logo-mark"><Sparkles size={18} /></div>
          <strong>SocialHub</strong>
        </div>

        <div className={`auth-step-wrap ${authStep === 1 ? 'step-entered' : ''}`} key={authStep}>
          {authStep === 0 && (
            <div className="auth-step-body">
              <div className="auth-modal-heading">
                <h2>{isRegister ? 'Create your workspace' : 'Welcome back'}</h2>
                <p>{isRegister ? 'Start publishing with AI in minutes.' : 'Sign in to your workspace.'}</p>
              </div>

              {error && (
                <div className="auth-error-bar"><CircleAlert size={15} /><span>{error}</span></div>
              )}

              {googleAvailable && (
                <button className="google-auth-btn" type="button" onClick={handleGoogle} disabled={googleBusy}>
                  {googleBusy ? <Loader2 className="spin" size={17} /> : <GoogleIcon />}
                  Continue with Google
                </button>
              )}

              <div className="auth-divider"><span>or use your email</span></div>

              <form onSubmit={advance}>
                <div className="auth-field">
                  <label>Email address</label>
                  <input
                    type="email" value={email} autoFocus
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@company.com" required
                  />
                </div>
                <button className="purple-primary-btn auth-submit-btn" type="submit">
                  Continue <ArrowRight size={16} />
                </button>
              </form>

              <p className="auth-switch">
                {isRegister ? 'Already have an account?' : "Don't have an account?"}
                {' '}
                <button type="button" onClick={onSwitchMode}>
                  {isRegister ? 'Sign in' : 'Sign up free'}
                </button>
              </p>
            </div>
          )}

          {authStep === 1 && (
            <div className="auth-step-body">
              <button className="auth-back-btn" type="button" onClick={() => setAuthStep(0)}>
                ← Back
              </button>
              <div className="auth-modal-heading">
                <h2>{isRegister ? 'Almost there' : 'Enter your password'}</h2>
                <p className="auth-email-pill"><span>{email}</span></p>
              </div>

              {error && (
                <div className="auth-error-bar"><CircleAlert size={15} /><span>{error}</span></div>
              )}

              <form onSubmit={submit}>
                {isRegister && (
                  <>
                    <div className="auth-field">
                      <label>Your name</label>
                      <input
                        value={form.name} autoFocus
                        onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                        placeholder="Jane Smith"
                      />
                    </div>
                    <div className="auth-field">
                      <label>Company / Brand</label>
                      <input
                        value={form.company}
                        onChange={(e) => setForm((f) => ({ ...f, company: e.target.value }))}
                        placeholder="Acme Media"
                      />
                    </div>
                  </>
                )}
                <div className="auth-field">
                  <label>Password</label>
                  <input
                    type="password" value={form.password}
                    onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
                    placeholder={isRegister ? 'Create a password (min. 6 chars)' : 'Your password'}
                    required minLength={6} autoFocus={!isRegister}
                  />
                </div>
                <button className="purple-primary-btn auth-submit-btn" type="submit" disabled={busy}>
                  {busy ? <Loader2 className="spin" size={17} /> : isRegister ? <UserPlus size={17} /> : <KeyRound size={17} />}
                  {busy ? 'Working…' : isRegister ? 'Create workspace' : 'Sign in'}
                </button>
              </form>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ─── Landing + AuthScreen shell ─────────────────────────────────── */
function AuthScreen({ onSubmit, onGoogleAuth, googleAvailable, error }) {
  const [authMode, setAuthMode] = useState(null);
  const [scrolled, setScrolled] = useState(false);
  const [slideIdx, setSlideIdx] = useState(0);
  const [featRef, featVisible] = useReveal();
  const [statsRef, statsVisible] = useReveal();
  const [platformRef, platformVisible] = useReveal(0.08);
  const [pricingRef, pricingVisible] = useReveal(0.06);
  const [ctaRef, ctaVisible] = useReveal();

  useEffect(() => {
    function onScroll() { setScrolled(window.scrollY > 40); }
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    const t = setInterval(() => setSlideIdx((i) => (i + 1) % SHOWCASE_CARDS.length), 4200);
    return () => clearInterval(t);
  }, []);

  const activeCard = SHOWCASE_CARDS[slideIdx];

  return (
    <div className="landing-root">
      <div className="landing-glow" />

      {/* ── Nav ── */}
      <nav className={`landing-nav ${scrolled ? 'landing-nav-scrolled' : ''}`}>
        <div className="landing-nav-brand">
          <div className="landing-nav-mark"><Sparkles size={16} /></div>
          <strong>SocialHub</strong>
        </div>
        <div className="landing-nav-actions">
          <button className="landing-nav-link" type="button" onClick={() => setAuthMode('login')}>Sign in</button>
          <button className="purple-primary-btn landing-nav-cta" type="button" onClick={() => setAuthMode('register')}>
            Get started free
          </button>
        </div>
      </nav>

      {/* ── Hero ── */}
      <section className="landing-hero">
        <div className="hero-badge"><Sparkles size={12} /><span>AI-Powered Social Media Automation</span></div>

        <h1 className="hero-title">
          {HERO_WORDS.map((word, i) => (
            <span className="hero-word" key={word} style={{ animationDelay: `${0.08 + i * 0.14}s` }}>{word}{' '}</span>
          ))}
          <br />
          <span className="hero-title-accent" style={{ animationDelay: '0.62s' }}>All in one workspace.</span>
        </h1>

        <p className="hero-subtitle">
          SocialHub uses Claude AI for scripts, ElevenLabs for voiceovers, and publishes directly to YouTube, Instagram, Facebook and TikTok — in minutes, not days.
        </p>

        <div className="hero-actions">
          <button className="purple-primary-btn large-purple-btn" type="button" onClick={() => setAuthMode('register')}>
            <Rocket size={17} /> Start for free
          </button>
          <button className="hero-secondary-btn" type="button" onClick={() => setAuthMode('login')}>
            <KeyRound size={16} /> Sign in
          </button>
        </div>

        <div className="hero-platform-row">
          {PLATFORM_TILES.map((p) => (
            <span className="hero-platform-chip" key={p.id}>
              <span className="hero-platform-dot" style={{ background: p.color }} />
              {p.name}
            </span>
          ))}
        </div>

        {/* Dashboard mock */}
        <div className="hero-dashboard-preview">
          <div className="preview-bar">
            <span className="preview-dot" style={{ background: '#f87171' }} />
            <span className="preview-dot" style={{ background: '#fbbf24' }} />
            <span className="preview-dot" style={{ background: '#34d399' }} />
            <span className="preview-title">SocialHub — AI Factory</span>
          </div>
          <div className="preview-body">
            <div className="preview-sidebar">
              {['Command', 'Workflow', 'Connections', 'AI Factory', 'Launch'].map((item) => (
                <div className={`preview-nav-item ${item === 'AI Factory' ? 'preview-nav-active' : ''}`} key={item}>
                  <div className="preview-nav-dot" /><span>{item}</span>
                </div>
              ))}
            </div>
            <div className="preview-content">
              <div className="preview-card preview-card-wide">
                <div className="preview-label">AI Script</div>
                <div className="preview-lines">
                  <div className="preview-line" style={{ width: '85%' }} />
                  <div className="preview-line" style={{ width: '72%' }} />
                  <div className="preview-line" style={{ width: '60%' }} />
                </div>
              </div>
              <div className="preview-card-row">
                <div className="preview-card preview-card-sm">
                  <div className="preview-label">Voiceover</div>
                  <div className="preview-wave">
                    {[3,5,8,6,4,7,5,9,6,4,7,5].map((h, i) => (
                      <span key={i} style={{ height: `${h * 3}px` }} />
                    ))}
                  </div>
                </div>
                <div className="preview-card preview-card-sm">
                  <div className="preview-label">Platforms</div>
                  <div className="preview-platform-dots">
                    {['#ff0000','#e1306c','#1877f2','#ee1d52'].map((c) => (
                      <span key={c} className="preview-platform-dot" style={{ background: c }} />
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Stats strip ── */}
      <div ref={statsRef} className={`landing-stats-strip ${statsVisible ? 'is-visible' : ''}`}>
        {[
          { value: '10×', label: 'Faster content creation' },
          { value: '4',   label: 'Platforms in one click' },
          { value: '100%', label: 'AI-generated scripts' },
          { value: '<5min', label: 'From brief to published' },
        ].map((s) => (
          <div className="stat-item" key={s.label}>
            <strong>{s.value}</strong>
            <span>{s.label}</span>
          </div>
        ))}
      </div>

      {/* ── Marquee ── */}
      <div className="marquee-section">
        <p className="marquee-label">Powered by the world's leading AI & social platforms</p>
        <div className="marquee-track">
          <div className="marquee-inner">
            {[...MARQUEE_ITEMS, ...MARQUEE_ITEMS].map((item, i) => (
              <span className="marquee-item" key={i}>
                <span className="marquee-dot" style={{ background: item.color }} />
                {item.label}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* ── Platform showcase ── */}
      <section ref={platformRef} className={`platform-showcase-section ${platformVisible ? 'is-visible' : ''}`}>
        <div className="landing-section-head">
          <p className="landing-eyebrow">Publish everywhere</p>
          <h2>One brief. Four platforms. Zero manual work.</h2>
          <p className="landing-section-sub">Your AI factory produces platform-optimised content for every channel simultaneously.</p>
        </div>
        <div className="platform-tiles-grid">
          {PLATFORM_TILES.map((tile, i) => (
            <div className="platform-tile" key={tile.id} style={{ '--delay': `${i * 0.1}s`, '--pc': tile.color }}>
              <div className="platform-tile-header">
                <span className="platform-tile-dot" style={{ background: tile.color }} />
                <strong>{tile.name}</strong>
                <span className="platform-tile-format">{tile.format}</span>
                <span className="platform-tile-reach">{tile.reach}</span>
              </div>
              <div className="platform-tile-screen" style={{ background: tile.bg }}>
                <div className="pts-chrome">
                  <span className="pts-chrome-dot" style={{ background: tile.color, opacity: 0.8 }} />
                  <span className="pts-chrome-title">{tile.name}</span>
                </div>
                <div className="pts-content">
                  <div className="pts-thumb">
                    <div className="pts-play"><Play size={14} fill="white" /></div>
                    <span className="pts-dur">{tile.preview.duration}</span>
                  </div>
                  <div className="pts-meta">
                    <div className="pts-title">{tile.preview.title}</div>
                    <div className="pts-channel">{tile.preview.channel}</div>
                    <div className="pts-stats">
                      <span>{tile.preview.views} views</span>
                      <span>·</span>
                      <span>{tile.preview.likes} likes</span>
                    </div>
                  </div>
                </div>
                <div className="pts-ai-badge"><Sparkles size={9} /> AI Generated</div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── How it works ── */}
      <section className="how-section">
        <div className="landing-section-head">
          <p className="landing-eyebrow">How it works</p>
          <h2>Four steps from idea to live.</h2>
          <p className="landing-section-sub">The entire content pipeline — automated.</p>
        </div>
        <div className="how-steps">
          {[
            { n: '01', icon: Wand2,       title: 'Brief your AI',      desc: 'Describe your topic, target audience, tone of voice and offer in plain language.' },
            { n: '02', icon: Mic2,        title: 'Generate & voice',   desc: 'Claude writes hooks, scripts and captions. ElevenLabs adds a studio voiceover.' },
            { n: '03', icon: Film,        title: 'Render your video',  desc: 'Your script and audio are assembled into polished vertical video automatically.' },
            { n: '04', icon: UploadCloud, title: 'Publish everywhere', desc: 'One click sends your video to YouTube, Instagram, Facebook and TikTok at once.' },
          ].map((s, i) => (
            <div className="how-step" key={s.n} style={{ '--delay': `${i * 0.1}s` }}>
              <div className="how-step-num">{s.n}</div>
              <div className="how-step-icon"><s.icon size={22} /></div>
              <strong>{s.title}</strong>
              <p>{s.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Video slideshow ── */}
      <section className="slideshow-section">
        <div className="landing-section-head">
          <p className="landing-eyebrow">Content in action</p>
          <h2>AI-produced content, live across every platform.</h2>
          <p className="landing-section-sub">Every video, reel and short was generated by SocialHub's AI factory.</p>
        </div>
        <div className="slideshow-layout">
          {/* Featured large card */}
          <div className="slideshow-featured" style={{ background: activeCard.bg }} key={slideIdx}>
            <div className="sf-overlay" />
            <div className="sf-platform-badge" style={{ color: activeCard.color, borderColor: `${activeCard.color}44`, background: `${activeCard.color}18` }}>
              <span className="platform-dot" style={{ background: activeCard.color, width: '6px', height: '6px' }} />
              {activeCard.platform}
            </div>
            <div className="sf-play-ring">
              <div className="sf-play-btn"><Play size={28} fill="white" /></div>
            </div>
            <div className="sf-meta">
              <div className="sf-title">{activeCard.title}</div>
              <div className="sf-stats">
                <span>{activeCard.views}</span>
                <span className="sf-dot-sep">·</span>
                <span>{activeCard.likes} likes</span>
                <span className="sf-dot-sep">·</span>
                <span>{activeCard.dur}</span>
              </div>
            </div>
            <div className="sf-ai-label"><Sparkles size={10} /> AI Generated</div>
          </div>

          {/* Thumbnail strip */}
          <div className="slideshow-strip">
            {SHOWCASE_CARDS.map((card, i) => (
              <button
                key={i}
                className={`ss-thumb ${i === slideIdx ? 'ss-thumb-active' : ''}`}
                style={{ background: card.bg }}
                onClick={() => setSlideIdx(i)}
                type="button"
              >
                <div className="ss-thumb-play"><Play size={10} fill="white" /></div>
                <div className="ss-thumb-meta">
                  <span style={{ color: card.color, fontSize: '9px', fontWeight: 700 }}>{card.platform}</span>
                  <span className="ss-thumb-title">{card.title}</span>
                </div>
                {i === slideIdx && <div className="ss-active-bar" style={{ background: card.color }} />}
              </button>
            ))}
          </div>
        </div>

        {/* Progress dots */}
        <div className="slideshow-dots">
          {SHOWCASE_CARDS.map((_, i) => (
            <button
              key={i}
              className={`slide-dot ${i === slideIdx ? 'slide-dot-active' : ''}`}
              onClick={() => setSlideIdx(i)}
              type="button"
              aria-label={`Slide ${i + 1}`}
            />
          ))}
        </div>
      </section>

      {/* ── Features ── */}
      <section ref={featRef} className={`landing-features ${featVisible ? 'is-visible' : ''}`}>
        <div className="landing-section-head">
          <p className="landing-eyebrow">Everything you need</p>
          <h2>One platform. End-to-end automation.</h2>
          <p className="landing-section-sub">From blank brief to published video — without leaving SocialHub.</p>
        </div>
        <div className="features-grid">
          {LANDING_FEATURES.map((f, i) => (
            <div className="feature-card" key={f.title} style={{ '--delay': `${i * 0.09}s` }}>
              <div className="feature-icon"><f.icon size={20} /></div>
              <strong>{f.title}</strong>
              <p>{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Pricing ── */}
      <section ref={pricingRef} className={`pricing-section ${pricingVisible ? 'is-visible' : ''}`}>
        <div className="landing-section-head">
          <p className="landing-eyebrow">Simple pricing</p>
          <h2>Choose your plan. Scale as you grow.</h2>
          <p className="landing-section-sub">All plans include AI scripts, voiceovers, video rendering and direct publishing.</p>
        </div>
        <div className="pricing-grid">
          {PRICING_PLANS_LANDING.map((plan, i) => (
            <div className={`pricing-card ${plan.highlight ? 'pricing-card-highlight' : ''}`} key={plan.id} style={{ '--delay': `${i * 0.12}s` }}>
              {plan.highlight && <div className="pricing-popular-badge">Most Popular</div>}
              <div className="pricing-card-top">
                <strong className="pricing-plan-name">{plan.name}</strong>
                <div className="pricing-price">
                  <span className="pricing-amount">{plan.price}</span>
                  <span className="pricing-period">{plan.period}</span>
                </div>
                <p className="pricing-desc">{plan.desc}</p>
              </div>
              <ul className="pricing-features">
                {plan.features.map((f) => (
                  <li key={f}><Check size={14} /><span>{f}</span></li>
                ))}
              </ul>
              <button
                className={plan.highlight ? 'purple-primary-btn pricing-cta-btn' : 'pricing-outline-btn'}
                type="button"
                onClick={() => setAuthMode('register')}
              >
                Get started
              </button>
            </div>
          ))}
        </div>
      </section>

      {/* ── CTA ── */}
      <section ref={ctaRef} className={`landing-cta-section ${ctaVisible ? 'is-visible' : ''}`}>
        <div className="landing-cta-card">
          <div className="cta-glow-orb" />
          <p className="landing-eyebrow">Start today</p>
          <h2>Ready to automate your content?</h2>
          <p>Join creators and agencies who publish smarter with AI — no manual editing required.</p>
          <div className="hero-actions">
            <button className="purple-primary-btn large-purple-btn" type="button" onClick={() => setAuthMode('register')}>
              <UserPlus size={17} /> Create free workspace
            </button>
            {googleAvailable && (
              <button className="google-auth-btn cta-google-btn" type="button" onClick={() => setAuthMode('register')}>
                <GoogleIcon /> Continue with Google
              </button>
            )}
          </div>
        </div>
      </section>

      <footer className="landing-footer">
        <div className="landing-nav-brand">
          <div className="landing-nav-mark"><Sparkles size={14} /></div>
          <strong>SocialHub</strong>
        </div>
        <div className="footer-links">
          <span>YouTube</span><span>·</span><span>Instagram</span><span>·</span>
          <span>TikTok</span><span>·</span><span>Facebook</span>
        </div>
        <span>© {new Date().getFullYear()} SocialHub · AI-powered content automation</span>
      </footer>

      {/* ── Auth modal ── */}
      {authMode && (
        <AuthModal
          mode={authMode}
          onClose={() => setAuthMode(null)}
          onSubmit={onSubmit}
          onGoogleAuth={onGoogleAuth}
          googleAvailable={googleAvailable}
          error={error}
          onSwitchMode={() => setAuthMode(authMode === 'register' ? 'login' : 'register')}
        />
      )}
    </div>
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
