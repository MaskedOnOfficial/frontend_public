import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Sparkles, Shield, Star, Camera, Users, ArrowRight, PartyPopper, Zap } from "lucide-react";

export default function HomePage() {
  return (
    <div className="auth-ambient min-h-screen bg-bg overflow-hidden">
      {/* Hero Section */}
      <section className="relative min-h-[85vh] flex items-center justify-center px-4 py-20">
        <div className="max-w-4xl mx-auto text-center relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <div className="inline-flex items-center gap-2 bg-primary/10 border border-primary/15 rounded-full px-5 py-2 mb-8">
              <Zap className="w-4 h-4 text-primary" />
              <span className="text-primary text-sm font-semibold">Where Elite Nightlife Begins</span>
            </div>

            <h1 className="text-5xl sm:text-6xl md:text-7xl font-black tracking-tight leading-[1.05] mb-6">
              <span className="text-text">Your Next</span><br />
              <span className="brand-gradient-text">Unforgettable Night</span><br />
              <span className="text-text">Starts Here</span>
            </h1>

            <p className="text-text-muted text-lg md:text-xl max-w-2xl mx-auto mb-10 leading-relaxed">
              Discover curated parties. Build social trust. Connect with your city's most exclusive circles. 
              <span className="text-primary font-medium"> This isn't just an app — it's your social passport.</span>
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link
                to="/auth/register"
                className="btn-primary-luxe text-lg font-bold px-10 py-4 rounded-2xl flex items-center gap-3 w-full sm:w-auto justify-center"
              >
                Get Started
                <ArrowRight className="w-5 h-5" />
              </Link>
              <Link
                to="/auth/login"
                className="btn-secondary-luxe text-lg font-semibold px-10 py-4 rounded-2xl w-full sm:w-auto text-center"
              >
                Sign In
              </Link>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Features */}
      <section className="relative z-10 max-w-6xl mx-auto px-4 pb-24">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-center mb-16"
        >
          <h2 className="text-3xl md:text-4xl font-bold text-text tracking-tight mb-4">
            Built for the <span className="brand-gradient-text">inner circle</span>
          </h2>
          <p className="text-text-muted max-w-lg mx-auto">
            Every feature designed to elevate your social experience.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {[
            {
              icon: PartyPopper,
              title: "Curated Events",
              desc: "Discover exclusive parties handpicked for your vibe and trusted through ratings.",
              gradient: "from-primary to-accent",
              glow: "shadow-primary/20",
            },
            {
              icon: Shield,
              title: "Trust Gates",
              desc: "Hosts set minimum social ratings. Higher your rating, more doors open.",
              gradient: "from-accent to-primary",
              glow: "shadow-accent/20",
            },
            {
              icon: Star,
              title: "Social Rating",
              desc: "Build your reputation event by event. Your score is your social currency.",
              gradient: "from-warning to-hot",
              glow: "shadow-warning/20",
            },
            {
              icon: Camera,
              title: "Shared Moments",
              desc: "Party photo galleries, likes, and comments. Relive every night.",
              gradient: "from-hot to-primary",
              glow: "shadow-hot/20",
            },
          ].map((feature, i) => (
            <motion.div
              key={feature.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className="glass-card p-6 group"
            >
              <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${feature.gradient} flex items-center justify-center shadow-lg ${feature.glow} mb-5 group-hover:scale-110 transition-transform`}>
                <feature.icon className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-text font-bold text-lg mb-2">{feature.title}</h3>
              <p className="text-text-muted text-sm leading-relaxed">{feature.desc}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Social Proof */}
      <section className="relative z-10 max-w-4xl mx-auto px-4 pb-24">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="glass-panel rounded-3xl p-8 md:p-12 text-center"
        >
          <div className="flex items-center justify-center gap-4 mb-6">
            <div className="flex -space-x-3">
              {[
                "bg-gradient-to-br from-primary to-accent",
                "bg-gradient-to-br from-accent to-hot",
                "bg-gradient-to-br from-hot to-primary",
                "bg-gradient-to-br from-warning to-hot",
              ].map((gradient, i) => (
                <div key={i}
                  className={`w-10 h-10 rounded-full ${gradient} border-2 border-bg flex items-center justify-center text-white text-xs font-bold`}
                >
                  <Users className="w-4 h-4" />
                </div>
              ))}
            </div>
          </div>
          <h3 className="text-2xl md:text-3xl font-bold text-text mb-3 tracking-tight">
            Join the revolution
          </h3>
          <p className="text-text-muted max-w-md mx-auto mb-8">
            Thousands of partygoers trust maskOn to find the best events and build genuine social connections.
          </p>
          <Link
            to="/auth/register"
            className="btn-hot-luxe text-base font-bold px-10 py-4 rounded-2xl inline-flex items-center gap-3"
          >
            <Sparkles className="w-5 h-5" />
            Claim Your Spot
          </Link>
        </motion.div>
      </section>
    </div>
  );
}
