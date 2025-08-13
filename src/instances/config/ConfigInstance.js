import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
// Config control doesn't exist, so we'll create a simple placeholder
function ConfigControl({ instanceId }) {
    return (
        <div className="min-h-screen p-8" style={{ backgroundColor: '#F5F5F5', color: 'black' }}>
            <h1 className="text-3xl font-bold mb-4">Auto Config Checker</h1>
            <p>Instance ID: {instanceId}</p>
            <p>Config checker functionality coming soon...</p>
        </div>
    );
}

export default function ConfigInstance() {
    const { id } = useParams();
    const [instanceId, setInstanceId] = useState('');
    const [timestamp, setTimestamp] = useState('');

    useEffect(() => {
        if (id) {
            setInstanceId(id);
            setTimestamp(new Date().toISOString());
            document.title = `Config Control`;
        }
    }, [id]);

    if (!instanceId || !timestamp) {
        return (
            <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: 'white', color: 'black' }}>
                <div className="text-black text-lg">Initializing instance...</div>
            </div>
        );
    }

    return (
        <div>
            <ConfigControl instanceId={instanceId} />
        </div>
    );
} 