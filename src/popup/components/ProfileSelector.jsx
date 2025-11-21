export default function ProfileSelector({ profiles, currentProfile, onSwitch, onCreate, onDelete }) {
  return (
    <div className="profile-selector">
      <select 
        value={currentProfile.id} 
        onChange={(e) => onSwitch(e.target.value)}
      >
        {profiles.map(p => (
          <option key={p.id} value={p.id}>{p.name}</option>
        ))}
      </select>
      <button onClick={onCreate}>+</button>
      <button 
        onClick={() => onDelete(currentProfile.id)}
        disabled={profiles.length === 1}
        title={profiles.length === 1 ? "Cannot delete the last profile" : "Delete profile"}
      >
        🗑️
      </button>
    </div>
  );
}