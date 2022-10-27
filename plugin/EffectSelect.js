const sides = [
  { id: 1, name: 'Gain' },
  { id: 2, name: 'Chorus' },
  { id: 3, name: 'Flanger' },
  { id: 4, name: 'Bitcrush' },
  { id: 5, name: 'Distortion' },
  { id: 6, name: 'Delay' },
];

export default function EffectSelect(props) {
  const {setSelectedEffect, selected, ...other} = props;

  return (
    <div {...other}>
      {sides.map((side, sideIdx) => (
        <div key={sideIdx} className="relative flex items-center py-2">
          <input
            id={`side-${side.id}`}
            name="effect"
            type="radio"
            className="p-2 m-2 border-gray-300 text-indigo-600 focus:ring-indigo-500"
            checked={side.id === selected}
            onChange={(e) => setSelectedEffect(side.id)}
          />
          <div className="min-w-0 flex-1 text-sm">
            <label htmlFor={`side-${side.id}`} className="select-none font-medium text-gray-700">
              {side.name}
            </label>
          </div>
        </div>
      ))}
    </div>
  )
}
