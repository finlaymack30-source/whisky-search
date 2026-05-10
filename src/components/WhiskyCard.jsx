function WhiskyCard({ whisky, saved, onSave }) {
  const scoreColor = whisky.score >= 4.5
    ? 'bg-green-700'
    : whisky.score >= 4.0
    ? 'bg-amber-600'
    : 'bg-gray-500'

  return (
    <div className={`bg-white rounded-xl border ${saved ? 'border-amber-500 border-2' : 'border-gray-200'} p-4 flex flex-col gap-3`}>
      <div className="flex justify-between items-start">
        <div className={`${scoreColor} text-white rounded-full w-10 h-10 flex items-center justify-center font-semibold text-sm`}>
          {whisky.score}
        </div>
        <button onClick={() => onSave(whisky.id)} className="text-gray-400 hover:text-amber-500 transition-colors text-xl">
          {saved ? '★' : '☆'}
        </button>
      </div>

      <div>
        <h3 className="font-semibold text-gray-900 text-sm leading-tight">{whisky.name}</h3>
        <p className="text-gray-500 text-xs mt-0.5">{whisky.distillery}</p>
      </div>

      <div className="flex flex-wrap gap-1.5">
        <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">{whisky.region}</span>
        <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">{whisky.type}</span>
        {whisky.age && <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">{whisky.age}yr</span>}
        <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">{whisky.abv}%</span>
      </div>

      <p className="text-xs text-gray-500 italic leading-relaxed">{whisky.note}</p>

      <p className="text-xs text-gray-400">{whisky.ratings.toLocaleString()} ratings</p>
    </div>
  )
}

export default WhiskyCard