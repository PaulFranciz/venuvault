interface SpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string; 
}

function Spinner({ size = 'md', className = '' }: SpinnerProps) {
  let sizeClasses = '';
  switch (size) {
    case 'sm':
      sizeClasses = 'w-4 h-4 border-2';
      break;
    case 'lg':
      sizeClasses = 'w-12 h-12 border-4';
      break;
    case 'md':
    default:
      sizeClasses = 'w-8 h-8 border-4';
      break;
  }

  return (
    <div className={`flex justify-center items-center min-h-[200px] ${className}`.trim()}>
      <div className={`${sizeClasses} border-blue-600 border-t-transparent rounded-full animate-spin`} />
    </div>
  );
}

export default Spinner;
