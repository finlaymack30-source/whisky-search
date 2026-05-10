function WhiskyCard({ whisky, saved, onSave }) {
  const scoreColor = whisky.score >= 4.5
    ? 'bg-green-700'
    : whisky.score >= 4.0
    ? 'bg-amber-600'
    : whisky.score >= 3.5
    ? 'bg-amber-400'
    : 'bg-gray-400'

  return (
    <div className={`bg-white rounded-xl border ${saved ? 'border-amber-500 border-2' : 'border-gray-200'} p-4 flex flex-col gap-2`}>
      <div className="flex justify-between items-start">
        <div className={`${scoreColor} text-white rounded-full w-10 h-10 flex items-center justify-center font-semibold text-sm flex-shrink-0`}>
          {whisky.score}
        </div>
        <button onClick={() => onSave(whisky.id)} className="text-gray-400 hover:text-amber-500 transition-colors text-xl">
          {saved ? '★' : '☆'}
        </button>
      </div>

      <div>
        <h3 className="font-semibold text-gray-900 text-sm leading-tight">{whisky.title}</h3>
        <p className="text-gray-500 text-xs mt-0.5">{whisky.distillery}</p>
      </div>

      <div className="flex flex-wrap gap-1">
        {whisky.region && <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">{whisky.region}</span>}
        {whisky.type && <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">{whisky.type}</span>}
        {whisky.age && <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">{whisky.age}yr</span>}
        {whisky.abv && <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">{whisky.abv}%</span>}
      </div>

      {whisky.cask_type && (
        <p className="text-xs text-gray-400 italic">{whisky.cask_type}</p>
      )}

      {whisky.tasting_note && (
        <p className="text-xs text-gray-500 leading-relaxed">{whisky.tasting_note}</p>
      )}

      {whisky.price_gbp && (
        <p className="text-xs font-medium text-amber-700 mt-auto">£{whisky.price_gbp}</p>
      )}
    </div>
  )
}

export default WhiskyCard