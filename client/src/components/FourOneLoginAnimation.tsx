import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Building2, Users, BarChart3, Settings } from "lucide-react";

interface FourOneLoginAnimationProps {
  isVisible: boolean;
  onComplete?: () => void;
}

export default function FourOneLoginAnimation({ isVisible, onComplete }: FourOneLoginAnimationProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [showLogo, setShowLogo] = useState(false);

  // Icons representing the four "1"s of Four One Solutions
  const fourOnes = [
    { icon: Building2, label: "Gestión", color: "text-blue-500" },
    { icon: Users, label: "Equipos", color: "text-green-500" },
    { icon: BarChart3, label: "Analytics", color: "text-purple-500" },
    { icon: Settings, label: "Control", color: "text-orange-500" }
  ];

  useEffect(() => {
    if (!isVisible) return;

    const timer = setTimeout(() => {
      if (currentStep < fourOnes.length) {
        setCurrentStep(currentStep + 1);
      } else if (!showLogo) {
        setShowLogo(true);
        setTimeout(() => {
          onComplete?.();
        }, 3000);
      }
    }, 600);

    return () => clearTimeout(timer);
  }, [currentStep, isVisible, showLogo, onComplete, fourOnes.length]);

  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 bg-gradient-to-br from-blue-900 via-blue-800 to-indigo-900 flex items-center justify-center z-50">
      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute top-1/4 left-1/4 w-32 h-32 bg-white rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-1/4 right-1/4 w-24 h-24 bg-blue-300 rounded-full blur-2xl animate-pulse delay-1000"></div>
        <div className="absolute top-1/2 right-1/3 w-20 h-20 bg-indigo-300 rounded-full blur-xl animate-pulse delay-500"></div>
      </div>

      <div className="relative flex flex-col items-center space-y-8">
        {/* Four "1"s Animation */}
        <div className="flex items-center justify-center space-x-4">
          {fourOnes.map((item, index) => {
            const IconComponent = item.icon;
            const isActive = currentStep > index;
            
            return (
              <motion.div
                key={index}
                initial={{ scale: 0, opacity: 0, y: 20 }}
                animate={{
                  scale: isActive ? 1 : 0,
                  opacity: isActive ? 1 : 0,
                  y: isActive ? 0 : 20,
                  rotate: isActive ? [0, 10, -10, 0] : 0
                }}
                transition={{
                  duration: 0.5,
                  delay: index * 0.2,
                  rotate: { delay: index * 0.2 + 0.3, duration: 0.4 }
                }}
                className="relative"
              >
                {/* Glow Effect */}
                <motion.div
                  className="absolute inset-0 bg-white rounded-full blur-md"
                  animate={{
                    scale: isActive ? [1, 1.2, 1] : 1,
                    opacity: isActive ? [0.3, 0.6, 0.3] : 0
                  }}
                  transition={{
                    duration: 2,
                    repeat: Infinity,
                    delay: index * 0.2
                  }}
                />
                
                {/* Icon Container */}
                <div className="relative w-16 h-16 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center border border-white/30">
                  <IconComponent className={`w-8 h-8 text-white ${item.color}`} />
                </div>
                
                {/* Label */}
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: isActive ? 1 : 0, y: isActive ? 0 : 10 }}
                  transition={{ delay: index * 0.2 + 0.3 }}
                  className="absolute -bottom-8 left-1/2 transform -translate-x-1/2 text-white text-sm font-medium whitespace-nowrap"
                >
                  {item.label}
                </motion.div>
              </motion.div>
            );
          })}
        </div>

        {/* Connecting Lines */}
        <motion.div
          className="flex items-center justify-center space-x-2 mt-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: currentStep >= fourOnes.length ? 1 : 0 }}
          transition={{ delay: 2.5 }}
        >
          {[0, 1, 2].map((_, index) => (
            <motion.div
              key={index}
              className="w-8 h-0.5 bg-gradient-to-r from-blue-400 to-indigo-400"
              initial={{ scaleX: 0 }}
              animate={{ scaleX: currentStep >= fourOnes.length ? 1 : 0 }}
              transition={{ delay: 2.5 + index * 0.1, duration: 0.3 }}
            />
          ))}
        </motion.div>

        {/* Four One Solutions Logo Text */}
        <AnimatePresence>
          {showLogo && (
            <motion.div
              initial={{ opacity: 0, y: 30, scale: 0.8 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              transition={{ duration: 0.6, ease: "easeOut" }}
              className="text-center"
            >
              {/* Main Title */}
              <motion.h1
                className="text-4xl md:text-6xl font-bold text-white mb-2"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.3 }}
              >
                <span className="bg-gradient-to-r from-blue-400 via-purple-400 to-indigo-400 bg-clip-text text-transparent">
                  Four One
                </span>
              </motion.h1>
              
              {/* Subtitle */}
              <motion.p
                className="text-xl text-blue-200 font-medium"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.6 }}
              >
                Solutions
              </motion.p>
              
              {/* Tagline */}
              <motion.p
                className="text-sm text-blue-300 mt-4 font-light"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.9 }}
              >
                Una solución. Cuatro pilares. Infinitas posibilidades.
              </motion.p>

              {/* Binary Code Animation */}
              <motion.div
                className="flex justify-center mt-6 space-x-2"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 1.2 }}
              >
                {[1, 1, 1, 1].map((digit, index) => (
                  <motion.span
                    key={index}
                    className="text-2xl font-mono text-blue-400"
                    initial={{ opacity: 0, scale: 0 }}
                    animate={{ 
                      opacity: [0, 1, 1, 0.5, 1],
                      scale: [0, 1.2, 1, 1.1, 1]
                    }}
                    transition={{
                      delay: 1.2 + index * 0.1,
                      duration: 0.8,
                      repeat: Infinity,
                      repeatDelay: 2
                    }}
                  >
                    {digit}
                  </motion.span>
                ))}
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Loading Indicator */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: showLogo ? 1 : 0 }}
          transition={{ delay: 1.5 }}
          className="mt-8"
        >
          <div className="flex space-x-1">
            {[0, 1, 2].map((index) => (
              <motion.div
                key={index}
                className="w-2 h-2 bg-blue-400 rounded-full"
                animate={{
                  y: [0, -8, 0],
                  opacity: [0.5, 1, 0.5]
                }}
                transition={{
                  duration: 0.6,
                  repeat: Infinity,
                  delay: index * 0.1
                }}
              />
            ))}
          </div>
        </motion.div>
      </div>
    </div>
  );
}