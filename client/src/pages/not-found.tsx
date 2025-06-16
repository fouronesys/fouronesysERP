import { Card, CardContent } from "@/components/ui/card";
import { AlertCircle } from "lucide-react";
import { motion } from "framer-motion";

export default function NotFound() {
  // Animaciones
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.2
      }
    }
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
      transition: { type: "spring", bounce: 0.5 }
    }
  };

  const iconVariants = {
    hover: {
      rotate: [0, 10, -10, 10, -5, 5, 0],
      scale: [1, 1.2, 1.2, 1.2, 1],
      transition: { duration: 1.5 }
    },
    shake: {
      rotate: [0, 15, -15, 15, -15, 0],
      transition: { duration: 0.8 }
    },
    jump: {
      y: [0, -30, 0],
      transition: { duration: 0.5 }
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-gray-50 p-4">
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: "spring", damping: 10 }}
      >
        <Card className="w-full max-w-md mx-4 relative overflow-hidden">
          {/* Decoración animada */}
          <motion.div 
            className="absolute -top-20 -right-20 w-40 h-40 bg-red-100 rounded-full"
            animate={{
              scale: [1, 1.2, 1],
              rotate: [0, 180],
            }}
            transition={{
              duration: 8,
              repeat: Infinity,
              ease: "easeInOut"
            }}
          />

          <CardContent className="pt-6 relative z-10">
            <motion.div 
              className="flex mb-4 gap-2 items-center"
              variants={containerVariants}
              initial="hidden"
              animate="visible"
            >
              <motion.div variants={itemVariants}>
                <motion.div
                  variants={iconVariants}
                  whileHover="hover"
                  animate="jump"
                  className="cursor-pointer"
                >
                  <AlertCircle className="h-12 w-12 text-red-500" />
                </motion.div>
              </motion.div>

              <motion.h1 
                className="text-2xl font-bold text-gray-900"
                variants={itemVariants}
                animate="shake"
              >
                404 Page Not Found
              </motion.h1>
            </motion.div>

            <motion.p 
              className="mt-4 text-sm text-gray-600"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.8 }}
            >
              Did you forget to add the page to the router?
            </motion.p>

            <motion.div
              className="mt-6 flex justify-center"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1.2 }}
            >
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="px-4 py-2 bg-red-500 text-white rounded-lg shadow hover:bg-red-600 transition-colors"
              >
                Go to Home
              </motion.button>
            </motion.div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}