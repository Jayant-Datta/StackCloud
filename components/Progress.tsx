
const Progress = ({Percentage}:{Percentage: number} ) => {
  return (
    <div className="flex gap-2 mt-4 flex-col ">
       <div className="flex items-center gap-2">
        <div className="w-full h-2 bg-[#ffdadf63] rounded-full" >
            <div className="h-2 bg-white rounded-full "
            style={ {width: `${Percentage > 100 ? 100 : Percentage}%` } } ></div>
        </div>
        <span className="font-semibold text-sm text-white" >{Percentage.toFixed(2)}%</span>
       </div>
    </div>
  )
}

export default Progress