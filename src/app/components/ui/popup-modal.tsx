'use client';

interface PopupModalProps {
  title: string;
  children: React.ReactNode; // Content inside the modal
  onClose: () => void;       // Close handler
  onConfirm?: () => void;    // Optional confirm handler
  confirmText?: string;      // Text for the confirm button
  showConfirm?: boolean;     // Whether to show the confirm button
}

export default function PopupModal({
  title,
  children,
  onClose,
  onConfirm,
  confirmText = 'Confirm',
  showConfirm = true,
}: PopupModalProps) {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white p-6 rounded-lg shadow-lg w-96">
        {/* Title */}
        <h2 className="text-xl font-bold mb-4 text-gray-700">{title}</h2>

        {/* Modal Content */}
        <div className="mb-4">{children}</div>

        {/* Buttons */}
        <div className="flex justify-end gap-2">
          <button
            className="px-4 py-2 bg-gray-300 text-gray-800 rounded hover:bg-gray-400"
            onClick={onClose}
          >
            Cancel
          </button>
          {showConfirm && onConfirm && (
            <button
              className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
              onClick={onConfirm}
            >
              {confirmText}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
