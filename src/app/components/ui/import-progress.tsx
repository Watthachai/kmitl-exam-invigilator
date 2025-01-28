import { motion } from "framer-motion";

interface ImportProgressProps {
  progress: number;
  currentStage: string;
  logs: string[];
}

export default function ImportProgress({ progress, currentStage, logs }: ImportProgressProps) {
  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center">
      <motion.div 
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="bg-white rounded-lg p-8 w-[500px] max-h-[600px] flex flex-col gap-6"
      >
        <h2 className="text-xl font-semibold">Importing Data...</h2>
        
        {/* Progress Bar */}
        <div className="relative pt-1">
          <div className="flex mb-2 items-center justify-between">
            <div className="text-sm font-semibold">{currentStage}</div>
            <div className="text-sm font-semibold">{progress}%</div>
          </div>
          <div className="overflow-hidden h-2 text-xs flex rounded bg-blue-100">
            <motion.div 
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.5 }}
              className="shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center bg-blue-500"
            />
          </div>
        </div>

        {/* Logs Section */}
        <div className="flex-1 overflow-auto bg-gray-50 rounded-lg p-4">
          <div className="space-y-2">
            {logs.map((log, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className="text-sm font-mono"
              >
                {log}
              </motion.div>
            ))}
          </div>
        </div>
      </motion.div>
    </div>
  );
}