function classNames(...classes) {
  return classes.filter(Boolean).join(' ')
}

export default function Dropdown(props) {
  const {options, className, ...other} = props;

  return (
    <select
      className={classNames(className, "mt-1 block w-full bg-[#a9a9a9] border-neutral-500 focus:border-neutral-500 py-2 pl-3 pr-10 text-base outline-0 focus:outline-0 ring-0 focus:ring-0")}
      style={{WebkitAppearance: 'none'}}
      {...other}>
      {options.map(function(opt, i) {
        return (
          <option key={opt.id} value={opt.id}>{opt.name}</option>
        );
      })}
    </select>
  )
}
