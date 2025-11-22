export default function ProfileSelector({ profiles, currentProfile, onSwitch }) {
  return (
    <select 
      value={currentProfile.id} 
      onChange={(e) => onSwitch(e.target.value)}
      className="bg-bg-secondary text-text-primary border border-border rounded-md px-3 py-2 text-sm focus:outline-none focus:border-primary cursor-pointer"
    >
      {profiles.map(p => (
        <option key={p.id} value={p.id}>{p.name}</option>
      ))}
    </select>
  );
}