import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Share2, Copy, Check, Link, QrCode, X } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { formatTaskCode } from '../../lib/taskCodes';

interface ShareTaskCardProps {
  taskCode: string;
  isDisabled?: boolean;
}

export const ShareTaskCard: React.FC<ShareTaskCardProps> = ({
  taskCode,
  isDisabled = false,
}) => {
  const [copied, setCopied] = useState(false);
  const [showQRModal, setShowQRModal] = useState(false);

  const baseUrl = import.meta.env.VITE_BASE_URL || window.location.origin;
  const taskLink = `${baseUrl}?taskCode=${taskCode}`;
  const formattedCode = formatTaskCode(taskCode);

  const handleCopy = async () => {
    if (isDisabled) return;

    try {
      await navigator.clipboard.writeText(taskLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      // Silent fail - clipboard API may not be available
    }
  };

  return (
    <motion.div
      data-tutorial="share-task"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className={`rounded-xl border p-5 ${
        isDisabled
          ? 'bg-slate-50 border-slate-200 opacity-60'
          : 'bg-gradient-to-br from-gold-50 to-white border-gold-200'
      }`}
    >
      {/* Header */}
      <div className="flex items-center gap-2 mb-4">
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
          isDisabled ? 'bg-slate-200 text-slate-400' : 'bg-gold-100 text-gold-600'
        }`}>
          <Share2 className="w-4 h-4" />
        </div>
        <h3 className={`font-semibold ${isDisabled ? 'text-slate-500' : 'text-slate-900'}`}>
          Share with Students
        </h3>
      </div>

      {/* Link Display */}
      <div className={`flex items-center gap-2 rounded-lg border p-3 mb-4 ${
        isDisabled
          ? 'bg-slate-100 border-slate-200'
          : 'bg-white border-slate-200'
      }`}>
        <Link className={`w-4 h-4 flex-shrink-0 ${isDisabled ? 'text-slate-300' : 'text-slate-400'}`} />
        <span className={`flex-1 font-mono text-sm truncate ${
          isDisabled ? 'text-slate-400' : 'text-slate-700'
        }`}>
          {taskLink}
        </span>

        {/* Copy Button */}
        <motion.button
          onClick={handleCopy}
          disabled={isDisabled}
          whileHover={!isDisabled ? { scale: 1.02 } : {}}
          whileTap={!isDisabled ? { scale: 0.98 } : {}}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm transition-colors flex-shrink-0 ${
            isDisabled
              ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
              : copied
              ? 'bg-emerald-500 text-white'
              : 'bg-navy-800 text-white hover:bg-navy-900'
          }`}
        >
          <AnimatePresence mode="wait">
            {copied ? (
              <motion.div
                key="check"
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                exit={{ scale: 0 }}
                transition={{ duration: 0.15 }}
                className="flex items-center gap-2"
              >
                <Check className="w-4 h-4" />
                <span>Copied!</span>
              </motion.div>
            ) : (
              <motion.div
                key="copy"
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                exit={{ scale: 0 }}
                transition={{ duration: 0.15 }}
                className="flex items-center gap-2"
              >
                <Copy className="w-4 h-4" />
                <span>Copy Link</span>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.button>
      </div>

      {/* QR Code and Helper Text */}
      <div className="flex items-start gap-4">
        {/* QR Code - Clickable */}
        <motion.div
          onClick={() => !isDisabled && setShowQRModal(true)}
          whileHover={!isDisabled ? { scale: 1.05 } : {}}
          whileTap={!isDisabled ? { scale: 0.98 } : {}}
          className={`flex-shrink-0 p-2 rounded-lg border transition-shadow ${
            isDisabled
              ? 'bg-slate-100 border-slate-200'
              : 'bg-white border-slate-200 cursor-pointer hover:shadow-md hover:border-gold-300'
          }`}
          title={!isDisabled ? "Click to enlarge QR code" : undefined}
        >
          <QRCodeSVG
            value={taskLink}
            size={80}
            level="M"
            includeMargin={false}
            bgColor="transparent"
            fgColor={isDisabled ? '#94a3b8' : '#1e293b'}
          />
        </motion.div>

        {/* Helper Text */}
        <div className="flex-1">
          <p className={`text-sm ${isDisabled ? 'text-slate-400' : 'text-slate-600'}`}>
            Students can scan the QR code, use the link, or enter code:{' '}
            <span className={`font-mono font-bold ${isDisabled ? 'text-slate-500' : 'text-slate-800'}`}>
              {formattedCode}
            </span>
          </p>
          <p className={`text-xs mt-1 ${isDisabled ? 'text-slate-400' : 'text-slate-500'}`}>
            <QrCode className="w-3 h-3 inline mr-1" />
            Show QR code on projector for quick classroom access
          </p>
        </div>
      </div>

      {/* Disabled Warning */}
      {isDisabled && (
        <p className="text-xs text-amber-600 mt-3 bg-amber-50 px-3 py-2 rounded-lg border border-amber-200">
          This task is inactive. Activate it to share with students.
        </p>
      )}

      {/* QR Code Modal */}
      <AnimatePresence>
        {showQRModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
            onClick={() => setShowQRModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="bg-white rounded-2xl p-8 shadow-2xl max-w-sm w-full mx-4"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Modal Header */}
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold text-slate-900">Scan to Join</h3>
                <button
                  onClick={() => setShowQRModal(false)}
                  className="p-2 rounded-lg hover:bg-slate-100 transition-colors"
                >
                  <X className="w-5 h-5 text-slate-500" />
                </button>
              </div>

              {/* Large QR Code */}
              <div className="flex justify-center mb-6">
                <div className="p-4 bg-white rounded-xl border-2 border-slate-200">
                  <QRCodeSVG
                    value={taskLink}
                    size={280}
                    level="M"
                    includeMargin={false}
                    bgColor="transparent"
                    fgColor="#1e293b"
                  />
                </div>
              </div>

              {/* Task Code */}
              <div className="text-center">
                <p className="text-sm text-slate-500 mb-1">Or enter code:</p>
                <p className="text-2xl font-mono font-bold text-slate-900 tracking-wider">
                  {formattedCode}
                </p>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};
