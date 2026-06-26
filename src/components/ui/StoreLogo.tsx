import AILogo from './AILogo';

interface StoreLogoProps {
  name?: string;
  size?: number;
  className?: string;
}

const StoreLogo = ({ size = 40, className = '' }: StoreLogoProps) => {
  return <AILogo size={size} className={className} />;
};

export default StoreLogo;
