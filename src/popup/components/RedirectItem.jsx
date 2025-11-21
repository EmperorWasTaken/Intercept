export default function RedirectItem({ redirect, onUpdate, onDelete }) {
  return (
    <div className="item">
      <input
        type="checkbox"
        checked={redirect.enabled}
        onChange={(e) => onUpdate(redirect.id, 'enabled', e.target.checked)}
      />
      <div className="item-fields">
        <input
          type="text"
          placeholder="From URL"
          value={redirect.from}
          onChange={(e) => onUpdate(redirect.id, 'from', e.target.value)}
        />
        <input
          type="text"
          placeholder="To URL"
          value={redirect.to}
          onChange={(e) => onUpdate(redirect.id, 'to', e.target.value)}
        />
      </div>
      <button onClick={() => onDelete(redirect.id)}>🗑️</button>
    </div>
  );
}