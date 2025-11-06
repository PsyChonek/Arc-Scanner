import React, { useState, useEffect } from 'react';

function ItemDetails({ item, onClose }) {
  const [imageSrc, setImageSrc] = useState(null);

  useEffect(() => {
    // Load image through IPC to convert file:// URL to data URL
    if (item?.image_url) {
      window.electronAPI.loadImage(item.image_url).then(dataUrl => {
        if (dataUrl) {
          setImageSrc(dataUrl);
        }
      });
    }
  }, [item?.image_url]);

  if (!item) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onClick={onClose}>
      <div
        className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center">
          <div className="flex items-center gap-3">
            {imageSrc && (
              <img
                src={imageSrc}
                alt={item.name}
                className="w-8 h-8 object-contain rounded"
                onError={(e) => {
                  e.target.style.display = 'none';
                }}
              />
            )}
            <h2 className="text-2xl font-bold text-gray-900">{item.name}</h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-2xl font-bold"
          >
            ×
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {/* Basic Info */}
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <label className="text-sm font-semibold text-gray-600">Type</label>
              <p className="text-gray-900">{item.type || 'N/A'}</p>
            </div>
            <div>
              <label className="text-sm font-semibold text-gray-600">Rarity</label>
              <p className="text-gray-900 capitalize">{item.rarity || 'N/A'}</p>
            </div>
          </div>

          {/* Description */}
          {item.description && (
            <div className="mb-4">
              <label className="text-sm font-semibold text-gray-600">Description</label>
              <p className="text-gray-700 mt-1">{item.description}</p>
            </div>
          )}

          {/* Additional Data */}
          {item.data && Object.keys(item.data).length > 0 && (
            <div className="mb-4">
              <label className="text-sm font-semibold text-gray-600">Additional Information</label>
              <div className="mt-2 bg-gray-50 rounded p-3">
                <pre className="text-sm text-gray-700 overflow-x-auto whitespace-pre-wrap">
                  {JSON.stringify(item.data, null, 2)}
                </pre>
              </div>
            </div>
          )}

          {/* Metadata */}
          <div className="text-xs text-gray-500 border-t border-gray-200 pt-3 mt-4">
            <p>ID: {item.id}</p>
            {item.created_at && <p>Created: {new Date(item.created_at).toLocaleString()}</p>}
          </div>
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-gray-50 border-t border-gray-200 px-6 py-4">
          <button
            onClick={onClose}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-lg transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

export default ItemDetails;
