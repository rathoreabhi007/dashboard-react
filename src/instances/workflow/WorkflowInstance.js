import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import WorkflowTool from '../../controls/workflow/page';

export default function WorkflowInstance() {
    const { id } = useParams();
    const [instanceId, setInstanceId] = useState('');
    const [timestamp, setTimestamp] = useState('');

    useEffect(() => {
        if (id) {
            setInstanceId(id);
            setTimestamp(new Date().toISOString());
            document.title = `Data Workflow Tool`;
        }
    }, [id]);

    if (!instanceId || !timestamp) {
        return (
            <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: 'white', color: 'black' }}>
                <div className="text-black text-lg">Initializing Data Workflow Tool instance...</div>
            </div>
        );
    }

    return (
        <div>
            <WorkflowTool instanceId={instanceId} />
        </div>
    );
}
