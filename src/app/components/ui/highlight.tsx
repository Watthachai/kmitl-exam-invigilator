const Highlight = ({ text = "", search = "" }) => {
  if (!search.trim()) {
    return <span>{text}</span>;
  }

  const regex = new RegExp(`(${search})`, 'gi');
  const parts = text.split(regex);

  return (
    <span>
      {parts.map((part, i) => (
        regex.test(part) ? (
          <span key={i} className="bg-yellow-200">{part}</span>
        ) : (
          <span key={i}>{part}</span>
        )
      ))}
    </span>
  );
};

export default Highlight;