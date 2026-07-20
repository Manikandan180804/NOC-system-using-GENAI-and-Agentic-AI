// --- Configuration & State ---
const relativeCoords = {
    'CORE-A': { rx: 0.32, ry: 0.24 },
    'CORE-B': { rx: 0.68, ry: 0.24 },
    'EDGE-1': { rx: 0.18, ry: 0.68 },
    'EDGE-2': { rx: 0.50, ry: 0.74 },
    'EDGE-3': { rx: 0.82, ry: 0.68 }
};

const state = {
    isRunning: false,
    isHitlMode: false,
    autoResCount: 142,
    hitlResolver: null,
    currentFilter: 'ALL',
    lastIncidentReport: null,
    activeScenarioId: null,
    nodes: [
        { 
            id: 'CORE-A', x: 0, y: 0, type: 'core', label: 'Core Router A',
            cpu: 28, mem: 45, latency: 1.8, packetDrop: 0.0,
            interfaces: [
                { name: 'GigEth0/0/0', target: 'CORE-B', status: 'UP', speed: '100 Gbps' },
                { name: 'GigEth0/0/1', target: 'EDGE-1', status: 'UP', speed: '10 Gbps' },
                { name: 'GigEth0/0/2', target: 'EDGE-2', status: 'UP', speed: '10 Gbps' }
            ]
        },
        { 
            id: 'CORE-B', x: 0, y: 0, type: 'core', label: 'Core Router B',
            cpu: 22, mem: 40, latency: 1.6, packetDrop: 0.0,
            interfaces: [
                { name: 'GigEth0/0/0', target: 'CORE-A', status: 'UP', speed: '100 Gbps' },
                { name: 'GigEth0/0/1', target: 'EDGE-2', status: 'UP', speed: '10 Gbps' },
                { name: 'GigEth0/0/2', target: 'EDGE-3', status: 'UP', speed: '10 Gbps' }
            ]
        },
        { 
            id: 'EDGE-1', x: 0, y: 0, type: 'edge', label: 'Edge Switch 1',
            cpu: 18, mem: 32, latency: 3.1, packetDrop: 0.0,
            interfaces: [
                { name: 'Eth1/1', target: 'CORE-A', status: 'UP', speed: '10 Gbps' }
            ]
        },
        { 
            id: 'EDGE-2', x: 0, y: 0, type: 'edge', label: 'VNF Cluster Edge 2',
            cpu: 35, mem: 55, latency: 2.9, packetDrop: 0.0,
            interfaces: [
                { name: 'Eth1/1', target: 'CORE-A', status: 'UP', speed: '10 Gbps' },
                { name: 'Eth1/2', target: 'CORE-B', status: 'UP', speed: '10 Gbps' }
            ]
        },
        { 
            id: 'EDGE-3', x: 0, y: 0, type: 'edge', label: 'Security Edge 3',
            cpu: 20, mem: 38, latency: 3.4, packetDrop: 0.0,
            interfaces: [
                { name: 'Eth1/1', target: 'CORE-B', status: 'UP', speed: '10 Gbps' }
            ]
        }
    ],
    links: [
        { id: 'l1', from: 'CORE-A', to: 'CORE-B', status: 'normal' },
        { id: 'l2', from: 'CORE-A', to: 'EDGE-1', status: 'normal' },
        { id: 'l3', from: 'CORE-A', to: 'EDGE-2', status: 'normal' },
        { id: 'l4', from: 'CORE-B', to: 'EDGE-2', status: 'normal' },
        { id: 'l5', from: 'CORE-B', to: 'EDGE-3', status: 'normal' }
    ],
    fleet: [
        { id: 'supervisor', name: 'Supervisor LLM', type: 'Orchestrator Agent', status: 'IDLE', model: 'Gemini 1.5 Pro', active: false },
        { id: 'traffic', name: 'TrafficAgent', type: 'Route Optimization', status: 'READY', model: 'Gemini Flash 1.5', active: false },
        { id: 'service', name: 'ServiceAgent', type: 'VNF Autoscaling', status: 'READY', model: 'Gemini Flash 1.5', active: false },
        { id: 'security', name: 'SecurityAgent', type: 'Threat Remediation', status: 'READY', model: 'Gemini Flash 1.5', active: false }
    ],
    logs: []
};

// --- Initialization ---
document.addEventListener('DOMContentLoaded', () => {
    initTopology();
    renderAgentFleet();
    initResizers();
    addLog('SYSTEM', 'Autonomous NOC Command Center online. Resizable panels enabled.');

    window.addEventListener('resize', () => {
        initTopology();
    });
});

// --- Drag-to-Resize Panel Divider Implementation ---
function initResizers() {
    const resizerLeft = document.getElementById('resizer-left');
    const resizerRight = document.getElementById('resizer-right');
    const leftPanel = document.getElementById('leftPanel');
    const rightPanel = document.getElementById('rightPanel');
    const grid = document.getElementById('workspaceGrid');

    // Left Resizer
    if (resizerLeft && leftPanel) {
        let isDragging = false;

        resizerLeft.addEventListener('mousedown', (e) => {
            isDragging = true;
            document.body.style.cursor = 'col-resize';
            document.body.style.userSelect = 'none';
        });

        document.addEventListener('mousemove', (e) => {
            if (!isDragging) return;
            const gridRect = grid.getBoundingClientRect();
            let newWidth = e.clientX - gridRect.left;
            if (newWidth < 180) newWidth = 180;
            if (newWidth > 550) newWidth = 550;

            leftPanel.style.width = `${newWidth}px`;
            initTopology();
        });

        document.addEventListener('mouseup', () => {
            if (isDragging) {
                isDragging = false;
                document.body.style.cursor = '';
                document.body.style.userSelect = '';
                initTopology();
            }
        });
    }

    // Right Resizer
    if (resizerRight && rightPanel) {
        let isDragging = false;

        resizerRight.addEventListener('mousedown', (e) => {
            isDragging = true;
            document.body.style.cursor = 'col-resize';
            document.body.style.userSelect = 'none';
        });

        document.addEventListener('mousemove', (e) => {
            if (!isDragging) return;
            const gridRect = grid.getBoundingClientRect();
            let newWidth = gridRect.right - e.clientX;
            if (newWidth < 200) newWidth = 200;
            if (newWidth > 600) newWidth = 600;

            rightPanel.style.width = `${newWidth}px`;
            initTopology();
        });

        document.addEventListener('mouseup', () => {
            if (isDragging) {
                isDragging = false;
                document.body.style.cursor = '';
                document.body.style.userSelect = '';
                initTopology();
            }
        });
    }
}

// --- Sidebar & Dynamic View Navigation ---
function toggleSidebar() {
    const sidebar = document.getElementById('navSidebar');
    sidebar.classList.toggle('collapsed');
    setTimeout(initTopology, 320);
}

function setActiveNav(viewName) {
    document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));
    const targetNav = document.getElementById(`nav-${viewName}`);
    if (targetNav) targetNav.classList.add('active');

    const leftPanel = document.getElementById('leftPanel');
    const rightPanel = document.getElementById('rightPanel');
    const secSimulator = document.getElementById('section-simulator');
    const secAgents = document.getElementById('section-agents');
    const pageTitle = document.getElementById('pageTitle');
    const btnLeft = document.getElementById('btnToggleLeft');
    const btnRight = document.getElementById('btnToggleRight');

    if (viewName === 'topology') {
        pageTitle.innerText = 'NETWORK TOPOLOGY COMMAND CENTER';
        leftPanel.classList.remove('hidden-panel');
        rightPanel.classList.remove('hidden-panel');
        secSimulator.style.display = 'block';
        secAgents.style.display = 'block';
        btnLeft.classList.add('active-toggle');
        btnRight.classList.add('active-toggle');
    } else if (viewName === 'controls') {
        pageTitle.innerText = 'FAULT SIMULATION & INCIDENT ENGINE';
        leftPanel.classList.remove('hidden-panel');
        rightPanel.classList.add('hidden-panel');
        secSimulator.style.display = 'block';
        secAgents.style.display = 'none';
        btnLeft.classList.add('active-toggle');
        btnRight.classList.remove('active-toggle');
    } else if (viewName === 'agents') {
        pageTitle.innerText = 'AUTONOMOUS AGENT FLEET MONITOR';
        leftPanel.classList.remove('hidden-panel');
        rightPanel.classList.add('hidden-panel');
        secSimulator.style.display = 'none';
        secAgents.style.display = 'block';
        btnLeft.classList.add('active-toggle');
        btnRight.classList.remove('active-toggle');
    } else if (viewName === 'logs') {
        pageTitle.innerText = 'GENAI REASONING TRACE & AUDIT LOGS';
        leftPanel.classList.add('hidden-panel');
        rightPanel.classList.remove('hidden-panel');
        secSimulator.style.display = 'block';
        secAgents.style.display = 'block';
        btnLeft.classList.remove('active-toggle');
        btnRight.classList.add('active-toggle');
    }

    setTimeout(initTopology, 320);
}

function togglePanel(panelSide) {
    const panel = document.getElementById(panelSide === 'left' ? 'leftPanel' : 'rightPanel');
    const btn = document.getElementById(panelSide === 'left' ? 'btnToggleLeft' : 'btnToggleRight');
    
    panel.classList.toggle('hidden-panel');
    btn.classList.toggle('active-toggle');
    setTimeout(initTopology, 320);
}

function toggleHitlMode() {
    const hitlCheckbox = document.getElementById('hitlToggle');
    state.isHitlMode = hitlCheckbox.checked;
    
    if (state.isHitlMode) {
        addLog('SYSTEM', 'Operating mode switched to HUMAN-IN-THE-LOOP (HITL). Remediations require operator approval.');
    } else {
        addLog('SYSTEM', 'Operating mode switched to FULL AUTONOMOUS MODE.');
    }
}

// --- Dynamic Responsive Topology Renderer ---
function calculateNodeCoordinates() {
    const container = document.getElementById('topology');
    const w = container.clientWidth || 700;
    const h = container.clientHeight || 400;

    state.nodes.forEach(node => {
        const rel = relativeCoords[node.id];
        if (rel) {
            node.x = Math.round(w * rel.rx - 30);
            node.y = Math.round(h * rel.ry - 30);
        }
    });
}

function initTopology() {
    calculateNodeCoordinates();
    renderNodes();
    renderTopologyLinks();
}

function renderNodes() {
    const container = document.getElementById('nodesContainer');
    container.innerHTML = '';

    state.nodes.forEach(node => {
        const nodeEl = document.createElement('div');
        nodeEl.className = `node node-${node.type}`;
        nodeEl.id = `node-${node.id}`;
        nodeEl.style.left = `${node.x}px`;
        nodeEl.style.top = `${node.y}px`;
        
        const icon = node.type === 'core' ? '🌐' : '🖥️';
        nodeEl.innerHTML = `
            <div class="node-icon">${icon}</div>
            <span class="node-id">${node.id}</span>
            <div class="node-status-dot"></div>
        `;
        
        nodeEl.onclick = () => openNodeModal(node.id);
        container.appendChild(nodeEl);
    });
}

function renderTopologyLinks() {
    const svg = document.getElementById('topologySvg');
    svg.innerHTML = '';

    state.links.forEach(link => {
        const fromNode = state.nodes.find(n => n.id === link.from);
        const toNode = state.nodes.find(n => n.id === link.to);

        if (!fromNode || !toNode) return;

        const x1 = fromNode.x + 30;
        const y1 = fromNode.y + 30;
        const x2 = toNode.x + 30;
        const y2 = toNode.y + 30;

        const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        line.setAttribute('x1', x1);
        line.setAttribute('y1', y1);
        line.setAttribute('x2', x2);
        line.setAttribute('y2', y2);
        line.setAttribute('class', `topology-link link-${link.status}`);
        line.setAttribute('id', `svg-link-${link.id}`);

        svg.appendChild(line);

        const particle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        particle.setAttribute('r', '3.5');
        particle.setAttribute('class', `link-particle particle-${link.status}`);
        
        const animateMotion = document.createElementNS('http://www.w3.org/2000/svg', 'animateMotion');
        animateMotion.setAttribute('path', `M ${x1} ${y1} L ${x2} ${y2}`);
        animateMotion.setAttribute('dur', link.status === 'fault' ? '0.7s' : '2.8s');
        animateMotion.setAttribute('repeatCount', 'indefinite');
        
        particle.appendChild(animateMotion);
        svg.appendChild(particle);
    });
}

function updateLinkStatus(fromId, toId, status) {
    const link = state.links.find(l => 
        (l.from === fromId && l.to === toId) || (l.from === toId && l.to === fromId)
    );
    if (link) {
        link.status = status;
        renderTopologyLinks();
    }
}

function resetAllLinkStatuses() {
    state.links.forEach(l => l.status = 'normal');
    renderTopologyLinks();
}

// --- Agent Fleet Renderer ---
function renderAgentFleet() {
    const container = document.getElementById('agentList');
    container.innerHTML = state.fleet.map(agent => `
        <div class="agent-item ${agent.active ? 'active' : ''}">
            <div class="agent-name-group">
                <span class="aname">${agent.name}</span>
                <span class="atype">${agent.type}</span>
                <div class="agent-mini-meta">
                    <span class="meta-chip">LLM: ${agent.model}</span>
                </div>
            </div>
            <span class="astatus status-${agent.status.toLowerCase()}">${agent.status}</span>
        </div>
    `).join('');
}

function updateAgentState(agentId, status, active = false) {
    const agent = state.fleet.find(a => a.id === agentId);
    if (agent) {
        agent.status = status;
        agent.active = active;
        renderAgentFleet();
    }
}

function resetAgentStates() {
    state.fleet.forEach(a => {
        a.status = a.id === 'supervisor' ? 'IDLE' : 'READY';
        a.active = false;
    });
    renderAgentFleet();
}

// --- Log Engine ---
function addLog(type, message) {
    const logContainer = document.getElementById('thoughtLog');
    const time = new Date().toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });
    
    const entry = document.createElement('div');
    entry.className = `log-card category-${type.toLowerCase()}`;
    entry.setAttribute('data-category', type.toUpperCase());
    
    entry.innerHTML = `
        <div class="log-meta">
            <span class="log-time">${time}</span>
            <span class="log-tag tag-${type.toLowerCase()}">[${type}]</span>
        </div>
        <div class="log-body">${message}</div>
    `;
    
    state.logs.push({ time, type, message });
    logContainer.prepend(entry);
    
    applyLogFilter();
}

function filterLogs(filterType) {
    state.currentFilter = filterType;
    document.querySelectorAll('.filter-chip').forEach(chip => {
        chip.classList.toggle('active', chip.innerText.toUpperCase() === filterType || (filterType === 'ALL' && chip.innerText === 'All'));
    });
    applyLogFilter();
}

function applyLogFilter() {
    const entries = document.querySelectorAll('.log-card');
    entries.forEach(entry => {
        const category = entry.getAttribute('data-category');
        if (state.currentFilter === 'ALL' || category === state.currentFilter) {
            entry.style.display = 'block';
        } else {
            entry.style.display = 'none';
        }
    });
}

// --- Scenarios ---
const scenarios = {
    traffic: {
        name: 'Traffic Congestion & BGP Flapping',
        targetNode: 'CORE-A',
        steps: [
            { delay: 400, type: 'ALERT', agent: 'supervisor', msg: '🚨 CRITICAL ALARM: Core Router CORE-A BGP peer flapping with 192.168.10.2.', target: 'CORE-A', action: 'fault' },
            { delay: 1200, type: 'DIAGNOSIS', agent: 'supervisor', msg: 'Supervisor LLM: Packet drops (14%) identified on primary link CORE-A ↔ EDGE-1.' },
            { delay: 2400, type: 'ACTION', agent: 'traffic', isHighRisk: true, msg: 'TrafficAgent: Requesting BGP metric shift to divert traffic via CORE-B.', highlightLink: { from: 'CORE-A', to: 'EDGE-1', status: 'fault' } },
            { delay: 4000, type: 'ACTION', agent: 'traffic', msg: 'TrafficAgent: Applying BGP route policy update. Traffic stabilized via CORE-B.', highlightLink: { from: 'CORE-B', to: 'EDGE-2', status: 'active' } },
            { delay: 5500, type: 'DIAGNOSIS', agent: 'supervisor', msg: 'Post-Remediation Check: BGP flapping resolved. Core health: 100%.', action: 'resolve' }
        ]
    },
    service: {
        name: 'VNF Service Saturation',
        targetNode: 'EDGE-2',
        steps: [
            { delay: 400, type: 'ALERT', agent: 'supervisor', msg: '🚨 HIGH ALARM: VNF Cluster EDGE-2 reporting 98% CPU utilization.', target: 'EDGE-2', action: 'fault' },
            { delay: 1200, type: 'DIAGNOSIS', agent: 'supervisor', msg: 'Supervisor LLM: Video streaming surge detected on ingress interface.' },
            { delay: 2400, type: 'ACTION', agent: 'service', isHighRisk: true, msg: 'ServiceAgent: Dynamic horizontal autoscaling initiated (2x container replicas).', highlightLink: { from: 'CORE-A', to: 'EDGE-2', status: 'warning' } },
            { delay: 4200, type: 'ACTION', agent: 'service', msg: 'ServiceAgent: Container spin-up complete. Ingress load balanced successfully.' },
            { delay: 5800, type: 'DIAGNOSIS', agent: 'supervisor', msg: 'Post-Remediation Check: EDGE-2 CPU reduced to 34%. Latency 2.9ms.', action: 'resolve' }
        ]
    },
    security: {
        name: 'Security Anomaly & Outbound DDoS',
        targetNode: 'EDGE-3',
        steps: [
            { delay: 400, type: 'ALERT', agent: 'supervisor', msg: '🚨 SECURITY ALERT: Outbound packet spike (45,000 pps) on EDGE-3.', target: 'EDGE-3', action: 'fault' },
            { delay: 1200, type: 'DIAGNOSIS', agent: 'security', msg: 'SecurityAgent: Threat Engine identified UDP Amplification DDoS pattern.' },
            { delay: 2500, type: 'ACTION', agent: 'security', isHighRisk: true, msg: 'SecurityAgent: Deploying dynamic BGP Flowspec & ACL rule for 198.51.100.0/24.', highlightLink: { from: 'CORE-B', to: 'EDGE-3', status: 'fault' } },
            { delay: 4500, type: 'ACTION', agent: 'security', msg: 'SecurityAgent: Malicious traffic scrubbed. Firewall rules deployed.' },
            { delay: 6000, type: 'DIAGNOSIS', agent: 'supervisor', msg: 'Post-Remediation Check: Threat mitigated autonomously.', action: 'resolve' }
        ]
    }
};

async function runScenario(scenarioId) {
    if (state.isRunning) return;
    state.isRunning = true;
    state.activeScenarioId = scenarioId;

    document.querySelectorAll('.node').forEach(n => n.classList.remove('fault'));
    document.querySelectorAll('.scenario-btn').forEach(btn => btn.classList.remove('active'));
    
    const activeBtn = document.getElementById(`btn-${scenarioId}`);
    if (activeBtn) activeBtn.classList.add('active');

    resetAllLinkStatuses();
    resetAgentStates();
    document.getElementById('btnExport').disabled = true;

    setSystemStatus('INCIDENT IN PROGRESS', 'status-incident');
    const scenario = scenarios[scenarioId];
    addLog('SYSTEM', `▶ Starting Simulation: ${scenario.name}`);

    for (const step of scenario.steps) {
        await new Promise(r => setTimeout(r, step.delay));

        if (step.agent) {
            updateAgentState(step.agent, step.type === 'ACTION' ? 'EXECUTING' : 'ANALYZING', true);
        }

        if (step.highlightLink) {
            updateLinkStatus(step.highlightLink.from, step.highlightLink.to, step.highlightLink.status);
        }

        if (step.action === 'fault' && step.target) {
            const targetEl = document.getElementById(`node-${step.target}`);
            if (targetEl) targetEl.classList.add('fault');
            const nodeObj = state.nodes.find(n => n.id === step.target);
            if (nodeObj) { nodeObj.cpu = 96; nodeObj.packetDrop = 14.5; }
        }

        if (step.isHighRisk && state.isHitlMode) {
            updateAgentState(step.agent, 'AWAITING APPROVAL', true);
            addLog('HITL', `⏸ PAUSED FOR OPERATOR APPROVAL: ${step.msg}`);
            
            const approved = await requestHitlApproval(step.msg, step.target || scenario.targetNode);
            
            if (!approved) {
                addLog('HITL', '❌ Remediation REJECTED by operator. Incident execution halted.');
                setSystemStatus('MANUAL INTERVENTION', 'status-manual');
                resetAgentStates();
                state.isRunning = false;
                return;
            } else {
                addLog('HITL', '✓ Remediation APPROVED by operator. Resuming execution.');
            }
        }

        addLog(step.type, step.msg);

        if (step.action === 'resolve') {
            document.querySelectorAll('.node').forEach(n => n.classList.remove('fault'));
            resetAllLinkStatuses();
            
            state.nodes.forEach(n => {
                n.cpu = Math.floor(15 + Math.random() * 15);
                n.packetDrop = 0.0;
            });

            state.autoResCount++;
            document.getElementById('autoResCount').innerText = state.autoResCount;
            
            setSystemStatus('SYSTEM OPERATIONAL', 'status-operational');
            resetAgentStates();
            
            state.lastIncidentReport = generatePostMortemReport(scenario);
            document.getElementById('btnExport').disabled = false;
            state.isRunning = false;

            addLog('SYSTEM', `✅ Incident fully resolved autonomously.`);
        }
    }
}

// --- Custom Prompt Injector ---
async function injectCustomPrompt() {
    const promptInput = document.getElementById('customPrompt');
    const text = promptInput.value.trim();
    if (!text || state.isRunning) return;

    state.isRunning = true;
    promptInput.value = '';
    
    document.querySelectorAll('.node').forEach(n => n.classList.remove('fault'));
    resetAllLinkStatuses();
    resetAgentStates();

    setSystemStatus('CUSTOM INCIDENT ANALYZING', 'status-incident');
    addLog('SYSTEM', `📥 Ingested Prompt: "${text}"`);

    let targetNode = 'EDGE-1';
    if (text.toUpperCase().includes('CORE-A')) targetNode = 'CORE-A';
    else if (text.toUpperCase().includes('CORE-B')) targetNode = 'CORE-B';
    else if (text.toUpperCase().includes('EDGE-2')) targetNode = 'EDGE-2';
    else if (text.toUpperCase().includes('EDGE-3')) targetNode = 'EDGE-3';

    await new Promise(r => setTimeout(r, 600));
    updateAgentState('supervisor', 'ANALYZING', true);
    addLog('DIAGNOSIS', `Supervisor LLM: Parsed prompt target [${targetNode}]. Diagnostic intent assertion active.`);

    await new Promise(r => setTimeout(r, 1200));
    const targetEl = document.getElementById(`node-${targetNode}`);
    if (targetEl) targetEl.classList.add('fault');
    updateLinkStatus(targetNode, 'CORE-A', 'fault');
    addLog('ALERT', `🚨 Synthetic Alert Asserted: Node ${targetNode} flagged for resolution.`);

    await new Promise(r => setTimeout(r, 1500));
    updateAgentState('traffic', 'EXECUTING', true);
    
    const actionMsg = `TrafficAgent: Interface reset & route reconfiguration on ${targetNode}.`;
    
    if (state.isHitlMode) {
        addLog('HITL', `⏸ HITL GATE: Approval required for port reset on ${targetNode}.`);
        const approved = await requestHitlApproval(actionMsg, targetNode);
        if (!approved) {
            addLog('HITL', '❌ Operator REJECTED execution. Prompt execution stopped.');
            setSystemStatus('MANUAL INTERVENTION', 'status-manual');
            resetAgentStates();
            state.isRunning = false;
            return;
        }
    }

    addLog('ACTION', actionMsg);

    await new Promise(r => setTimeout(r, 2000));
    if (targetEl) targetEl.classList.remove('fault');
    resetAllLinkStatuses();
    
    state.autoResCount++;
    document.getElementById('autoResCount').innerText = state.autoResCount;
    setSystemStatus('SYSTEM OPERATIONAL', 'status-operational');
    resetAgentStates();

    state.lastIncidentReport = generatePostMortemReport({ name: `Custom Prompt (${text})`, targetNode });
    document.getElementById('btnExport').disabled = false;
    state.isRunning = false;

    addLog('DIAGNOSIS', `✅ Remediated custom incident on ${targetNode}. System health: 100%.`);
}

// --- HITL Helpers ---
function requestHitlApproval(msg, targetNode) {
    return new Promise(resolve => {
        state.hitlResolver = resolve;
        document.getElementById('hitlActionMsg').innerText = msg;
        document.getElementById('hitlTargetNode').innerText = targetNode;
        document.getElementById('hitlApprovalOverlay').classList.remove('hidden');
    });
}

function resolveHitl(approved) {
    document.getElementById('hitlApprovalOverlay').classList.add('hidden');
    if (state.hitlResolver) {
        state.hitlResolver(approved);
        state.hitlResolver = null;
    }
}

function setSystemStatus(text, statusClass) {
    const badge = document.getElementById('systemStatusBadge');
    const label = document.getElementById('systemStatusText');
    badge.className = `status-badge ${statusClass}`;
    label.innerText = text;
}

// --- Node Inspector ---
function openNodeModal(nodeId) {
    const node = state.nodes.find(n => n.id === nodeId);
    if (!node) return;

    document.getElementById('modalNodeTitle').innerText = `${node.id} TELEMETRY`;
    document.getElementById('modalNodeIcon').innerText = node.type === 'core' ? '🌐' : '🖥️';

    document.getElementById('modalCpuBar').style.width = `${node.cpu}%`;
    document.getElementById('modalCpuVal').innerText = `${node.cpu}%`;

    document.getElementById('modalMemBar').style.width = `${node.mem}%`;
    document.getElementById('modalMemVal').innerText = `${node.mem}%`;

    document.getElementById('modalLatencyVal').innerText = `${node.latency} ms`;
    document.getElementById('modalPacketDropVal').innerText = `${node.packetDrop}%`;

    const intfContainer = document.getElementById('modalInterfaces');
    intfContainer.innerHTML = node.interfaces.map(i => `
        <div class="intf-row">
            <div><strong>${i.name}</strong> <small style="color:var(--text-muted)">➜ ${i.target}</small></div>
            <div><span class="ispeed">${i.speed}</span><span class="istatus">${i.status}</span></div>
        </div>
    `).join('');

    document.getElementById('nodeModal').classList.remove('hidden');
}

function closeNodeModal() { document.getElementById('nodeModal').classList.add('hidden'); }
function triggerNodeDiagnostic() { alert('Diagnostic sweep completed. Interfaces operating normally.'); }

function generatePostMortemReport(scenario) {
    return {
        incidentId: `INC-${Math.floor(100000 + Math.random() * 900000)}`,
        timestamp: new Date().toISOString(),
        scenarioName: scenario.name || 'Autonomous Network Incident',
        targetNode: scenario.targetNode || 'CORE-A',
        mttrSeconds: 2.4,
        status: 'RESOLVED',
        autonomousRemediation: true,
        hitlModeActive: state.isHitlMode,
        logs: [...state.logs.slice(0, 10)]
    };
}

function exportIncidentReport() {
    if (!state.lastIncidentReport) return;
    document.getElementById('reportText').innerText = JSON.stringify(state.lastIncidentReport, null, 2);
    document.getElementById('reportModal').classList.remove('hidden');
}

function closeReportModal() { document.getElementById('reportModal').classList.add('hidden'); }
function downloadReport() {
    if (!state.lastIncidentReport) return;
    const blob = new Blob([JSON.stringify(state.lastIncidentReport, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${state.lastIncidentReport.incidentId}_PostMortem.json`;
    a.click();
    URL.revokeObjectURL(url);
}
