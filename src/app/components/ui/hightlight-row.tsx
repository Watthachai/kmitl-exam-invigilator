import React from 'react';

interface HighlightedRowProps {
  data: Record<string, string | number | null>;
}

const HighlightedRow: React.FC<HighlightedRowProps> = ({ data }) => {
  return (
    <tr className="bg-yellow-200">
      {Object.entries(data).map(([key, value]) => (
        <td key={key} className="px-6 py-4 whitespace-nowrap">
          {value}
        </td>
      ))}
    </tr>
  );
};

export default HighlightedRow;