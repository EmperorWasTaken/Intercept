export default function FilterItem({ filter, onUpdate, onDelete }) {
  return (
    <div className="item">
      <input
        type="checkbox"
        checked={filter.enabled}
        onChange={(e) => onUpdate(filter.id, 'enabled', e.target.checked)}
      />
      <div className="item-fields">
        <input
          type="text"
          placeholder="URL Pattern (e.g., *://*.example.com/*)"
          value={filter.value}
          onChange={(e) => onUpdate(filter.id, 'value', e.target.value)}
        />
      </div>
      <button onClick={() => onDelete(filter.id)}>🗑️</button>
    </div>
  );
}
