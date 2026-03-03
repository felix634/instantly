'use client';

import { useUser } from '../context/UserContext';

const UserToggle: React.FC = () => {
    const { user, setUser } = useUser();

    return (
        <div className="flex items-center gap-1 p-1 rounded-xl glass">
            <button
                onClick={() => setUser('felix')}
                className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-all ${user === 'felix'
                        ? 'bg-primary text-primary-foreground shadow-lg'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
            >
                Félix
            </button>
            <button
                onClick={() => setUser('arpi')}
                className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-all ${user === 'arpi'
                        ? 'bg-primary text-primary-foreground shadow-lg'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
            >
                Árpi
            </button>
        </div>
    );
};

export default UserToggle;
