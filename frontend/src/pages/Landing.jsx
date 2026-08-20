import { Link } from 'react-router-dom'

const features = [
  {
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    title: 'Civic Awareness',
    desc: 'Stay informed about local government decisions, policies, and public services that affect your daily life.',
  },
  {
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    ),
    title: 'Community Engagement',
    desc: 'Connect with fellow citizens, participate in discussions, and collectively raise issues to the right authorities.',
  },
  {
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
      </svg>
    ),
    title: 'AI-Powered Insights',
    desc: 'Our AI engine analyses civic data to surface trends, predict issues, and provide actionable recommendations.',
  },
  {
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
      </svg>
    ),
    title: 'Transparent Reporting',
    desc: 'Track the status of civic complaints and requests in real-time with clear, transparent reporting dashboards.',
  },
  {
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
      </svg>
    ),
    title: 'Secure & Private',
    desc: 'Your data is protected with industry-standard encryption. Participate anonymously when you choose to.',
  },
  {
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064" />
      </svg>
    ),
    title: 'Nationwide Reach',
    desc: 'From local ward issues to national policy — CivicSense covers every level of governance in one platform.',
  },
]

const phases = [
  { phase: '01', title: 'User Authentication', desc: 'Secure registration and login system with role-based access.', done: true },
  { phase: '02', title: 'Civic Dashboard', desc: 'Personalised feed of local news, issues, and government updates.', done: false },
  { phase: '03', title: 'AI Integration', desc: 'Intelligent analysis and recommendations powered by machine learning.', done: false },
]

export default function Landing() {
  return (
    <div>
      {/* Hero */}
      <section className="bg-gradient-to-br from-blue-700 via-blue-600 to-indigo-700 text-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-24 md:py-32">
          <div className="max-w-3xl">
            <span className="inline-block bg-blue-500 bg-opacity-40 text-blue-100 text-xs font-semibold px-3 py-1 rounded-full mb-6 uppercase tracking-wider">
              Phase 1 — Foundation
            </span>
            <h1 className="text-4xl md:text-6xl font-extrabold leading-tight mb-6">
              Empowering Citizens Through <span className="text-blue-200">Civic Intelligence</span>
            </h1>
            <p className="text-lg md:text-xl text-blue-100 mb-10 leading-relaxed">
              CivicSense bridges the gap between citizens and governance. Stay informed, engage meaningfully, and drive change in your community — powered by AI.
            </p>
            <div className="flex flex-col sm:flex-row gap-4">
              <Link to="/register" className="bg-white text-blue-700 hover:bg-blue-50 font-bold px-8 py-4 rounded-xl transition-colors text-center text-base">
                Get Started Free
              </Link>
              <Link to="/login" className="border-2 border-white text-white hover:bg-white hover:text-blue-700 font-bold px-8 py-4 rounded-xl transition-colors text-center text-base">
                Sign In
              </Link>
            </div>
          </div>
        </div>

        {/* Wave divider */}
        <div className="h-16 bg-slate-50" style={{ clipPath: 'ellipse(55% 100% at 50% 100%)' }}></div>
      </section>

      {/* Stats */}
      <section className="bg-slate-50 py-12">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
            {[
              { value: '10K+', label: 'Citizens Registered' },
              { value: '500+', label: 'Issues Resolved' },
              { value: '50+', label: 'Cities Covered' },
              { value: '98%', label: 'Satisfaction Rate' },
            ].map(s => (
              <div key={s.label} className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
                <div className="text-3xl font-extrabold text-blue-600 mb-1">{s.value}</div>
                <div className="text-sm text-slate-500 font-medium">{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="bg-white py-20">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-14">
            <h2 className="text-3xl md:text-4xl font-extrabold text-slate-900 mb-4">
              Everything You Need to Be Civic-Smart
            </h2>
            <p className="text-slate-500 text-lg max-w-2xl mx-auto">
              A comprehensive platform built to bring transparency, accountability, and engagement to the heart of democracy.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map(f => (
              <div key={f.title} className="bg-slate-50 rounded-2xl p-6 border border-slate-100 hover:border-blue-200 hover:shadow-md transition-all duration-200 group">
                <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-xl flex items-center justify-center mb-4 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                  {f.icon}
                </div>
                <h3 className="font-bold text-slate-900 mb-2 text-lg">{f.title}</h3>
                <p className="text-slate-500 text-sm leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Roadmap */}
      <section className="bg-slate-900 text-white py-20">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-14">
            <h2 className="text-3xl md:text-4xl font-extrabold mb-4">Project Roadmap</h2>
            <p className="text-slate-400 text-lg">Building CivicSense phase by phase — transparently.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {phases.map(p => (
              <div key={p.phase} className={`rounded-2xl p-6 border ${p.done ? 'border-green-500 bg-green-900 bg-opacity-20' : 'border-slate-700 bg-slate-800'}`}>
                <div className={`text-4xl font-black mb-3 ${p.done ? 'text-green-400' : 'text-slate-600'}`}>{p.phase}</div>
                <div className="flex items-center gap-2 mb-2">
                  <h3 className="font-bold text-lg">{p.title}</h3>
                  {p.done && (
                    <span className="bg-green-500 text-white text-xs px-2 py-0.5 rounded-full font-semibold">Live</span>
                  )}
                </div>
                <p className="text-slate-400 text-sm">{p.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-blue-600 text-white py-20">
        <div className="max-w-3xl mx-auto px-4 text-center">
          <h2 className="text-3xl md:text-4xl font-extrabold mb-4">Ready to Make a Difference?</h2>
          <p className="text-blue-100 text-lg mb-8">
            Join thousands of citizens already using CivicSense to stay informed and drive change.
          </p>
          <Link to="/register" className="bg-white text-blue-700 hover:bg-blue-50 font-bold px-10 py-4 rounded-xl transition-colors text-base inline-block">
            Create Your Free Account
          </Link>
        </div>
      </section>
    </div>
  )
}
