import { Bolt } from "@/assets/icons";

interface HeaderProps {
  onMenuClick: () => void;
}

export default function Header({ onMenuClick }: HeaderProps) {
  return (
    <header className="absolute top-0 left-0 right-0 z-10 bg-white bg-opacity-95 shadow-md px-4 py-3 flex items-center justify-between">
      <div className="flex items-center">
        <Bolt className="text-primary mr-2" size={24} />
        <h1 className="text-lg font-semibold text-gray-800">EV Finder</h1>
      </div>
      <div>
        <button 
          className="p-2 rounded-full hover:bg-gray-100 transition-colors no-highlight"
          onClick={onMenuClick}
          aria-label="Open Menu"
        >
          <span className="material-icons text-gray-700">menu</span>
        </button>
      </div>
    </header>
  );
}
