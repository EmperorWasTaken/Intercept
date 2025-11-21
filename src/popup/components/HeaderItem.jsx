export default function HeaderItem({ header, onUpdate, onDelete }) {
  return (
    <div className="item">
      <input
        type="checkbox"
        checked={header.enabled}
        onChange={(e) => onUpdate(header.id, 'enabled', e.target.checked)}
      />
      <div className="item-fields">
        <input
          type="text"
          placeholder="Header Name"
          value={header.name}
          onChange={(e) => onUpdate(header.id, 'name', e.target.value)}
        />
        <input
          type="text"
          placeholder="Header Value"
          value={header.value}
          onChange={(e) => onUpdate(header.id, 'value', e.target.value)}
        />
      </div>
      <button onClick={() => onDelete(header.id)}>🗑️</button>
    </div>
  );
}