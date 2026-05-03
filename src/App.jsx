import { useEffect, useMemo, useState } from 'react';
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
  Play,
  PlugZap,
  RefreshCcw,
  Rocket,
  Send,
  ShieldCheck,
  Sparkles,
  SquareStack,
  TimerReset,
  UploadCloud,
  Users,
  UserPlus,
  Wand2,
  X,
} from 'lucide-react';
import { api, setToken } from './api.js';

const platformSeed = [
  {
    id: 'youtube',
    name: 'YouTube',
    handle: '@BrandChannel',
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
    handle: '@brandstudio',
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
    handle: 'Brand Page',
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
    handle: '@brandclips',
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

const apiMap = [
  { label: 'Claude', owner: 'Anthropic', use: 'Ideas, scripts, captions, hashtags', readiness: 90 },
  { label: 'ElevenLabs', owner: 'ElevenLabs', use: 'Voiceover generation', readiness: 85 },
  { label: 'Renderer', owner: 'Remotion or Creatomate', use: 'Vertical video creation', readiness: 75 },
  { label: 'YouTube', owner: 'Google', use: 'Video uploads and scheduling', readiness: 65 },
  { label: 'Meta', owner: 'Facebook/Instagram', use: 'Page and Reels publishing', readiness: 60 },
  { label: 'TikTok', owner: 'TikTok', use: 'Direct post or inbox approval', readiness: 45 },
  { label: 'Paystack', owner: 'Paystack', use: 'Plans, recurring billing, invoices, limits', readiness: 90 },
  { label: 'Stripe', owner: 'Stripe Atlas later', use: 'Optional international billing adapter', readiness: 55 },
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

  const connectedCount = platforms.filter((platform) => platform.connected).length;
  const directPlatforms = platforms.filter((platform) => platform.automation === 'Direct').length;
  const activePlan = plans.find((item) => item.id === plan);
  const projectedCost = activePlan?.displayPrice || (plan === 'starter' ? '₦25K' : plan === 'growth' ? '₦65K' : '₦150K');

  const selectedPlatformNames = useMemo(
    () => platformSeed.filter((platform) => selectedPlatforms.includes(platform.id)).map((platform) => platform.name),
    [selectedPlatforms],
  );

  useEffect(() => {
    let mounted = true;
    api
      .me()
      .then((payload) => {
        if (!mounted) return;
        if (payload.user) {
          hydrate(payload);
        }
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
    return <AuthScreen onSubmit={handleAuth} error={apiError} />;
  }

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand-lockup" aria-label="SocialHub">
          <div className="brand-mark">
            <Sparkles size={21} strokeWidth={2.4} />
          </div>
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
          <NavButton icon={ClipboardList} id="blueprint" label="Blueprint" activeView={activeView} setActiveView={setActiveView} />
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
            <p className="eyebrow">SaaS MVP</p>
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
            setPlan={setPlan}
            checkout={checkout}
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

function AuthScreen({ onSubmit, error }) {
  const [mode, setMode] = useState('register');
  const [form, setForm] = useState({
    name: '',
    company: '',
    email: '',
    password: '',
  });
  const [busy, setBusy] = useState(false);
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

  return (
    <main className="auth-screen">
      <section className="auth-panel">
        <div className="brand-lockup auth-brand" aria-label="SocialHub">
          <div className="brand-mark">
            <Sparkles size={21} strokeWidth={2.4} />
          </div>
          <div>
            <strong>SocialHub</strong>
            <span>Client content automation</span>
          </div>
        </div>

        <div>
          <p className="eyebrow">SaaS Access</p>
          <h1>{isRegister ? 'Create your workspace' : 'Sign in'}</h1>
        </div>

        {error && (
          <div className="alert-bar auth-alert" role="alert">
            <CircleAlert size={18} />
            <span>{error}</span>
          </div>
        )}

        <form className="auth-form" onSubmit={submit}>
          {isRegister && (
            <>
              <label>
                <span>Name</span>
                <input value={form.name} onChange={(event) => updateField('name', event.target.value)} />
              </label>
              <label>
                <span>Company</span>
                <input value={form.company} onChange={(event) => updateField('company', event.target.value)} />
              </label>
            </>
          )}
          <label>
            <span>Email</span>
            <input
              type="email"
              value={form.email}
              onChange={(event) => updateField('email', event.target.value)}
              required
            />
          </label>
          <label>
            <span>Password</span>
            <input
              type="password"
              value={form.password}
              onChange={(event) => updateField('password', event.target.value)}
              required
              minLength={6}
            />
          </label>

          <button className="primary-action large-action" type="submit" disabled={busy}>
            {busy ? <Loader2 className="spin" size={18} /> : isRegister ? <UserPlus size={18} /> : <KeyRound size={18} />}
            {busy ? 'Working' : isRegister ? 'Create workspace' : 'Sign in'}
          </button>
        </form>

        <button
          className="secondary-action full-width"
          type="button"
          onClick={() => setMode(isRegister ? 'login' : 'register')}
        >
          {isRegister ? 'I already have an account' : 'Create a new workspace'}
        </button>
      </section>
    </main>
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
        <strong>${projectedCost}</strong>
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
            <Rule label="Facebook" value="Page publishing only for the clean MVP." />
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
        <StatusPill label="Prototype mode" />
      </div>

      <div className="platform-grid">
        {platforms.map((platform) => (
          <article className="platform-card" key={platform.id}>
            <div className="platform-head">
              <span className="platform-dot" style={{ background: platform.color }} />
              <div>
                <strong>{platform.name}</strong>
                <span>{platform.handle}</span>
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

function Blueprint({ plan, plans, subscription, setPlan, checkout }) {
  const visiblePlans = plans.length
    ? plans
    : [
        { id: 'starter', displayPrice: '₦25K' },
        { id: 'growth', displayPrice: '₦65K' },
        { id: 'agency', displayPrice: '₦150K' },
      ];

  return (
    <section className="blueprint-screen">
      <div className="two-column">
        <section className="plain-panel">
          <p className="eyebrow">Build Plan</p>
          <h2>Ten-week SaaS roadmap</h2>
          <div className="phase-list">
            {phases.map((phase) => (
              <article className="phase-item" key={phase.title}>
                <div>
                  <strong>{phase.title}</strong>
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
          <p className="eyebrow">Business Model</p>
          <h2>Subscription packages</h2>
          <div className="pricing-toggle" role="group" aria-label="Pricing plan">
            {visiblePlans.map((item) => (
              <button className={plan === item.id ? 'is-selected' : ''} type="button" key={item.id} onClick={() => setPlan(item.id)}>
                {item.displayPrice}
              </button>
            ))}
          </div>
          <button className="primary-action full-width" type="button" onClick={() => checkout(plan)}>
            <CreditCard size={18} />
            Activate {visiblePlans.find((item) => item.id === plan)?.name || plan}
          </button>
          <div className="unit-economics">
            <Metric label="Current billing status" value={subscription?.status || 'trialing'} />
            <Metric label="Gross margin target" value="75-85%" />
            <Metric label="API cost per client" value="₦4K-₦18K" />
            <Metric label="MVP launch goal" value="20 clients" />
            <Metric label="Month 9 target" value="100 clients" />
          </div>
        </section>
      </div>

      <section className="api-panel">
        <div className="section-title-row">
          <div>
            <p className="eyebrow">Integration Map</p>
            <h2>API readiness</h2>
          </div>
          <StatusPill label="Review-aware" />
        </div>
        <div className="api-list">
          {apiMap.map((api) => (
            <article className="api-row" key={api.label}>
              <div>
                <strong>{api.label}</strong>
                <span>{api.owner} · {api.use}</span>
              </div>
              <div className="readiness">
                <span>{api.readiness}%</span>
                <div className="progress-bar">
                  <span style={{ width: `${api.readiness}%` }} />
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>
    </section>
  );
}

function StatusPill({ label }) {
  return <span className="status-pill">{label}</span>;
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
    blueprint: 'Build blueprint',
  };
  return titles[view] || 'Command center';
}

export default App;
