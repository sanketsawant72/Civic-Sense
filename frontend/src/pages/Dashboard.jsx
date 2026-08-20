import { useAuth } from '../context/AuthContext'
import { useNavigate } from 'react-router-dom'

const stats = [
  { label: 'Issues Reported',  value: '0',  icon: '📋', color: 'bg-blue-50 text-blue-600' },
  { label: 'Issues Resolved',  value: '0',  icon: '✅', color: 'bg-green-50 text-green-600' },
  { label: 'Community Votes',  value: '0',  icon: '🗳️', color: 'bg-purple-50 text-purple-600' },
  { label: 'Notifications',    value: '0',  icon: '🔔', color: 'bg-amber-50 text-amber-600' },
]

const upcomingFeatures = [
  { title: 'Report a Civic Issue',    desc: 'Submit infrastructure, sanitation, or safety issues to your local authority.', phase: 'Phase 2' },
  { title: 'Community Feed',          desc: 'Browse and upvote issues raised by fellow citizens in your area.',             phase: 'Phase 2' },
  { title: 'AI Issue Analyser',       desc: 'Get AI-powered insights and priority scores for civic complaints.',             phase: 'Phase 3' },
  { title: 'Government Response Hub', desc: 'Track official responses and resolution timelines in real time.',               phase: 'Phase 2' },
]

export default function Dashboard() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  const handleLogout = () => {
    logout()
    navigate('/')
  }

  // Format join date
  const joinedDate = user?.createdAt
    ? new Date(user.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })
    : 'Recently'

  return (
    <div className="bg-slate-50 min-h-screen">

      {/* Page header */}
      <div className="bg-gradient-to-r from-blue-700 to-indigo-700 text-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-4">
              {/* Avatar */}
              <div className="w-14 h-14 rounded-2xl bg-white bg-opacity-20 flex items-center justify-center text-2xl font-black text-white border-2 border-white border-opacity-30">
                {user?.name?.charAt(0).toUpperCase()}
              </div>
              <div>
                <h1 className="text-2xl font-extrabold">Welcome back, {user?.name?.split(' ')[0]}!</h1>
                <p className="text-blue-200 text-sm mt-0.5">Member since {joinedDate} · Role: <span className="capitalize font-semibold text-white">{user?.role}</span></p>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="self-start sm:self-auto bg-white bg-opacity-15 hover:bg-opacity-25 border border-white border-opacity-30 text-white text-sm font-semibold px-5 py-2.5 rounded-lg transition-all"
            >
              Sign Out
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-10">

        {/* Stats */}
        <section>
          <h2 className="text-lg font-bold text-slate-900 mb-4">Your Activity</h2>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {stats.map(s => (
              <div key={s.label} className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-xl mb-3 ${s.color}`}>
                  {s.icon}
                </div>
                <div className="text-3xl font-extrabold text-slate-900">{s.value}</div>
                <div className="text-sm text-slate-500 mt-0.5">{s.label}</div>
              </div>
            ))}
          </div>
        </section>

        {/* Account info */}
        <section>
          <h2 className="text-lg font-bold text-slate-900 mb-4">Account Details</h2>
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm divide-y divide-slate-100">
            {[
              { label: 'Full Name',  value: user?.name },
              { label: 'Email',     value: user?.email },
              { label: 'Role',      value: user?.role, capitalize: true },
              { label: 'Member Since', value: joinedDate },
            ].map(row => (
              <div key={row.label} className="flex items-center justify-between px-6 py-4">
                <span className="text-sm text-slate-500 font-medium">{row.label}</span>
                <span className={`text-sm font-semibold text-slate-800 ${row.capitalize ? 'capitalize' : ''}`}>
                  {row.value}
                </span>
              </div>
            ))}
          </div>
        </section>

        {/* Coming soon features */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-slate-900">Coming Soon</h2>
            <span className="text-xs bg-blue-100 text-blue-700 font-semibold px-3 py-1 rounded-full">Phase 2 &amp; 3</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {upcomingFeatures.map(f => (
              <div key={f.title} className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm flex gap-4 items-start opacity-75">
                <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center flex-shrink-0">
                  <svg className="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-semibold text-slate-700 text-sm">{f.title}</h3>
                    <span className="text-xs bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full">{f.phase}</span>
                  </div>
                  <p className="text-xs text-slate-400 leading-relaxed">{f.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

      </div>
    </div>
  )
}
