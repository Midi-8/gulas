import { useEffect, useState } from 'react';

function getElapsedMinutes(createdAt: string): number {
    const createdAtMs = new Date(createdAt).getTime();

    if (Number.isNaN(createdAtMs)) {
        return 0;
    }

    return Math.max(0, Math.floor((Date.now() - createdAtMs) / 60000));
}

export function useOrderTimer(createdAt: string): number {
    const [elapsedMinutes, setElapsedMinutes] = useState(0);

    useEffect(() => {
        const updateElapsedMinutes = () => {
            setElapsedMinutes(getElapsedMinutes(createdAt));
        };

        updateElapsedMinutes();

        const intervalId = window.setInterval(updateElapsedMinutes, 1000);

        return () => {
            window.clearInterval(intervalId);
        };
    }, [createdAt]);

    return elapsedMinutes;
}