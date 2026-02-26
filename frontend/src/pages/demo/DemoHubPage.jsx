import { Link } from 'react-router-dom'
import {
  Trophy,
  Swords,
  History,
  BarChart3,
  Gamepad2,
  LayoutGrid,
  ArrowLeft,
  Play,
} from 'lucide-react'

// ═══════════════════════════════════════════════════════════
// Demo Hub — central page with buttons to all demo routes
// ═══════════════════════════════════════════════════════════

const demoSections = [
  {
    title: 'Ranked Module',
    description: 'Matchmaking, game play, history & statistics',
    color: '#81b64c',
    items: [
      {
        to: '/demo/ranked',
        icon: Trophy,
        label: 'Ranked Lobby',
        desc: 'Find match, queue, rating display',
      },
      {
        to: '/demo/ranked/game',
        icon: Swords,
        label: 'Ranked Game',
        desc: 'Chess board, clocks, chat, resign/draw',
      },
      {
        to: '/demo/ranked/history',
        icon: History,
        label: 'Match History',
        desc: 'Game list, filters, pagination',
      },
      {
        to: '/demo/ranked/stats',
        icon: BarChart3,
        label: 'Statistics',
        desc: 'Rating chart, win rate, streaks',
      },
    ],
  },
  {
    title: 'Component Demos',
    description: 'Reusable UI components preview',
    color: '#3B82F6',
    items: [
      {
        to: '/demo/game',
        icon: Gamepad2,
        label: 'Game Components',
        desc: 'ChessBoard, Clock, Chat, Controls',
      },
      {
        to: '/demo/components',
        icon: LayoutGrid,
        label: 'Common Components',
        desc: 'Button, Input, Modal, Card, etc.',
      },
    ],
  },
]

const DemoHubPage = () => {
  return (
    <div className="min-h-screen bg-[#302e2b]">
      {/* Header */}
      <div className="bg-[#262421] border-b border-gray-700">
        <div className="max-w-5xl mx-auto px-4 py-6">
          <div className="flex items-center gap-4">
            <Link
              to="/"
              className="p-2 rounded-lg hover:bg-gray-700/50 text-gray-400 hover:text-white transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-white flex items-center gap-3">
                <Play className="w-6 h-6 text-[#81b64c]" />
                Demo Hub
              </h1>
              <p className="text-sm text-gray-400 mt-0.5">
                Test all pages and components without authentication
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-5xl mx-auto px-4 py-8 space-y-10">
        {demoSections.map((section) => (
          <div key={section.title}>
            {/* Section header */}
            <div className="mb-4">
              <h2
                className="text-xl font-bold mb-1"
                style={{ color: section.color }}
              >
                {section.title}
              </h2>
              <p className="text-sm text-gray-500">{section.description}</p>
            </div>

            {/* Cards grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {section.items.map((item) => {
                const Icon = item.icon
                return (
                  <Link
                    key={item.to}
                    to={item.to}
                    className="group block bg-[#262421] border border-gray-700 rounded-xl p-5 hover:border-gray-500 hover:bg-[#2d2b28] transition-all duration-200"
                  >
                    <div
                      className="w-10 h-10 rounded-lg flex items-center justify-center mb-3 transition-transform group-hover:scale-110"
                      style={{
                        backgroundColor: `${section.color}20`,
                      }}
                    >
                      <Icon
                        className="w-5 h-5"
                        style={{ color: section.color }}
                      />
                    </div>
                    <h3 className="font-semibold text-white text-sm mb-1 group-hover:text-[#81b64c] transition-colors">
                      {item.label}
                    </h3>
                    <p className="text-xs text-gray-500 leading-relaxed">
                      {item.desc}
                    </p>
                  </Link>
                )
              })}
            </div>
          </div>
        ))}

        {/* Quick tip */}
        <div className="bg-[#262421] border border-gray-700 rounded-xl p-4 text-center">
          <p className="text-xs text-gray-500">
            💡 Demo pages use mock data and don't require login. All WebSocket
            events are simulated locally.
          </p>
        </div>
      </div>
    </div>
  )
}

export default DemoHubPage
