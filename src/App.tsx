import React, { useState, useMemo, useRef } from 'react';
import { 
  Users, 
  Plus, 
  Undo2, 
  Redo2, 
  Save, 
  Download, 
  LayoutGrid, 
  Table as TableIcon, 
  Search, 
  Filter, 
  ChevronDown, 
  ChevronRight,
  GripVertical,
  Trash2,
  X,
  Maximize2,
  Minus,
  Plus as PlusIcon,
  Sparkles,
  Tags,
  Image as ImageIcon,
  Loader2,
  Settings2,
  ArrowUpDown,
  Flame,
  CheckCircle2,
  ArrowLeft,
  Palette,
  Type as TypeIcon
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '@/src/lib/utils';
import { Guest, Table, ViewMode, Stage, Project, Template } from './types';
import { suggestSeating } from './lib/seatingAlgorithm';
import { GoogleGenAI, Type } from "@google/genai";
import { toPng } from 'html-to-image';

// Memoized Table Component for performance
const TableComponent = React.memo(({ 
  table, 
  tableGuests, 
  activeSeat, 
  zoom,
  editingTableName,
  setEditingTableName,
  onSeatClick, 
  onTableMove, 
  onTableDelete, 
  onTableNameChange,
  onTableUpdate,
  onUnassignGuest
}: {
  table: Table;
  tableGuests: Guest[];
  activeSeat: { tableId: string; seatIndex: number } | null;
  zoom: number;
  editingTableName: string | null;
  setEditingTableName: (id: string | null) => void;
  onSeatClick: (seatIndex: number) => void;
  onTableMove: (id: string, x: number, y: number) => void;
  onTableDelete: (id: string) => void;
  onTableNameChange: (id: string, name: string) => void;
  onTableUpdate: (id: string, updates: Partial<Table>) => void;
  onUnassignGuest: (guestId: string) => void;
}) => {
  const currentCount = tableGuests.length;
  const tableRadius = table.radius || 96; // Default radius (w-48/2 = 24*4 = 96px)
  const [showColorPicker, setShowColorPicker] = useState(false);
  
  // Pre-calculate seat assignments
  const seatToGuestMap = new Map<number, Guest>();
  for (const g of tableGuests) {
    if (g.seatIndex !== undefined) {
      seatToGuestMap.set(g.seatIndex, g);
    }
  }

  const colors = [
    '#ffffff', '#fef2f2', '#fff7ed', '#f0fdf4', '#eff6ff', '#faf5ff', '#fdf2f8',
    '#fee2e2', '#ffedd5', '#dcfce7', '#dbeafe', '#f3e8ff', '#fce7f3',
    '#ef4444', '#f97316', '#22c55e', '#3b82f6', '#a855f7', '#ec4899'
  ];

  return (
    <motion.div
      key={table.id}
      drag
      dragMomentum={false}
      dragElastic={0}
      whileDrag={{ zIndex: 100, scale: 1.05, opacity: 0.8 }}
      onDragEnd={(_, info) => {
        onTableMove(table.id, table.x + info.offset.x, table.y + info.offset.y);
      }}
      className="absolute cursor-move group"
      style={{ x: table.x, y: table.y, left: 0, top: 0 }}
    >
      <div className="relative flex items-center justify-center">
        {/* Table Circle */}
        <div 
          className="rounded-full border-2 border-gray-300 flex flex-col items-center justify-center shadow-lg z-10 relative"
          style={{ 
            width: tableRadius * 2, 
            height: tableRadius * 2,
            backgroundColor: table.color || '#ffffff'
          }}
        >
          {editingTableName === table.id ? (
            <input 
              autoFocus
              className="text-sm font-bold text-gray-800 text-center bg-transparent border-none focus:ring-0 w-32"
              value={table.name}
              onChange={(e) => onTableNameChange(table.id, e.target.value)}
              onBlur={() => setEditingTableName(null)}
              onKeyDown={(e) => e.key === 'Enter' && setEditingTableName(null)}
            />
          ) : (
            <span 
              className="text-sm font-bold text-gray-800 hover:bg-black/5 px-2 rounded cursor-text"
              onDoubleClick={() => setEditingTableName(table.id)}
            >
              {table.name}
            </span>
          )}
          <span className="text-xs text-gray-400">{currentCount}/{table.seatsCount}</span>

          {/* Table Controls */}
          <div className="absolute -bottom-10 left-1/2 -translate-x-1/2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity bg-white/90 backdrop-blur border border-gray-200 rounded-full px-2 py-1 shadow-sm z-30">
            <button 
              onClick={() => setShowColorPicker(!showColorPicker)}
              className="p-1 hover:bg-gray-100 rounded-full"
              title="选择颜色"
            >
              <Palette className="w-3.5 h-3.5 text-gray-500" />
            </button>
            <div className="w-px h-3 bg-gray-200 mx-1" />
            <div className="flex items-center gap-1">
              <button 
                onClick={() => onTableUpdate(table.id, { radius: Math.max(40, tableRadius - 10) })}
                className="p-1 hover:bg-gray-100 rounded-full"
              >
                <Minus className="w-3 h-3 text-gray-500" />
              </button>
              <span className="text-[10px] font-mono text-gray-400 w-6 text-center">{tableRadius}</span>
              <button 
                onClick={() => onTableUpdate(table.id, { radius: Math.min(200, tableRadius + 10) })}
                className="p-1 hover:bg-gray-100 rounded-full"
              >
                <PlusIcon className="w-3 h-3 text-gray-500" />
              </button>
            </div>
          </div>

          {/* Color Picker Popover */}
          {showColorPicker && (
            <div className="absolute top-full mt-2 left-1/2 -translate-x-1/2 bg-white border border-gray-200 rounded-xl p-3 shadow-xl z-50 grid grid-cols-7 gap-1 w-48">
              {colors.map(c => (
                <button
                  key={c}
                  onClick={() => {
                    onTableUpdate(table.id, { color: c });
                    setShowColorPicker(false);
                  }}
                  className="w-5 h-5 rounded-full border border-gray-200 hover:scale-110 transition-transform"
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          )}
        </div>

        {/* Table Delete Button */}
        <button 
          onClick={() => onTableDelete(table.id)}
          className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-md z-20"
        >
          <X className="w-4 h-4" />
        </button>
        
        {/* Seats */}
        {Array.from({ length: table.seatsCount }).map((_, i) => {
          const angle = (i * 360) / table.seatsCount;
          const guestAtSeat = seatToGuestMap.get(i);
          
          // Dynamic width based on name length
          const baseWidth = 40;
          const charWidth = 12;
          const dynamicWidth = guestAtSeat ? Math.max(baseWidth, guestAtSeat.name.length * charWidth + 16) : baseWidth;
          const scale = tableRadius / 96; // Scale chairs with table

          // Calculate distance to prevent overlap
          // Circumference = 2 * PI * d
          // Space per seat = Circumference / seatsCount = (2 * PI * d) / seatsCount
          // We want: dynamicWidth * scale <= (2 * PI * d) / seatsCount
          // So: d >= (dynamicWidth * scale * seatsCount) / (2 * PI)
          const minDistanceToAvoidOverlap = (dynamicWidth * scale * table.seatsCount) / (2 * Math.PI);
          const seatDistance = Math.max(tableRadius + 26 * scale, minDistanceToAvoidOverlap + 12);

          const x = Math.cos((angle * Math.PI) / 180) * seatDistance;
          const y = Math.sin((angle * Math.PI) / 180) * seatDistance;

          return (
            <div
              key={i}
              onClick={(e) => {
                e.stopPropagation();
                onSeatClick(i);
              }}
              className={cn(
                "absolute h-10 rounded-md border-2 flex items-center justify-center transition-all cursor-pointer text-[10px] font-bold text-center px-1 overflow-hidden z-20",
                guestAtSeat 
                  ? cn(
                      "border-blue-500 shadow-sm",
                      guestAtSeat.status === 'confirmed' ? "bg-green-50 text-green-600 border-green-200" :
                      guestAtSeat.status === 'maybe' ? "bg-yellow-50 text-yellow-600 border-yellow-200" :
                      "bg-blue-50 text-blue-600"
                    )
                  : "border-dashed border-gray-200 bg-white text-gray-300 hover:border-blue-400 hover:text-blue-400 hover:bg-gray-50",
                activeSeat?.tableId === table.id && activeSeat?.seatIndex === i && "ring-4 ring-blue-500/20 border-blue-500 border-solid scale-110 z-30 bg-blue-50 text-blue-600"
              )}
              style={{
                width: dynamicWidth * scale,
                height: 40 * scale,
                transform: `translate(${x}px, ${y}px) rotate(${angle + 90}deg)`,
                fontSize: `${Math.max(8, 10 * scale)}px`
              }}
            >
              {guestAtSeat ? (
                <div className="relative w-full h-full flex items-center justify-center group/seat">
                  <span className="px-1 whitespace-pre-line leading-tight">
                    {guestAtSeat.name.replace(/\\n/g, '\n')}
                  </span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onUnassignGuest(guestAtSeat.id);
                    }}
                    className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover/seat:opacity-100 transition-opacity z-10"
                    style={{ transform: `rotate(${-angle - 90}deg)` }}
                  >
                    <X className="w-2.5 h-2.5" />
                  </button>
                </div>
              ) : (
                <Plus className={cn(
                  "w-4 h-4 transition-transform",
                  activeSeat?.tableId === table.id && activeSeat?.seatIndex === i ? "scale-125" : "group-hover:scale-110"
                )} />
              )}
            </div>
          );
        })}
      </div>
    </motion.div>
  );
});

export default function App() {
  const [viewMode, setViewMode] = useState<ViewMode>('setup');
  const [currentProject, setCurrentProject] = useState<Project | null>(null);
  const [projectName, setProjectName] = useState('');
  const [projectRemarks, setProjectRemarks] = useState('');
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('blank');
  const [templateSearchQuery, setTemplateSearchQuery] = useState('');

  const templates: Template[] = [
    { id: 'blank', name: '空白项目', description: '从零开始创建座位表，自由添加桌位和宾客', tablesCount: 0, seatsPerTable: 0, hasStage: false, isPublic: true, hotCount: 0 },
    { id: 't1', name: '【模板】12人圆桌-共20桌', description: '适用于大型婚礼或宴会，包含20张12人圆桌和主舞台', tablesCount: 20, seatsPerTable: 12, hasStage: true, isPublic: true, hotCount: 56 },
    { id: 't2', name: '【模板】10人圆桌-共40桌', description: '适用于超大型宴会，包含40张10人圆桌和主舞台', tablesCount: 40, seatsPerTable: 10, hasStage: true, isPublic: true, hotCount: 84 },
    { id: 't3', name: '【模板】10人圆桌-共30桌', description: '标准宴会布局，包含30张10人圆桌和主舞台', tablesCount: 30, seatsPerTable: 10, hasStage: true, isPublic: true, hotCount: 89 },
    { id: 't4', name: '【模板】10人圆桌-共20桌', description: '中型宴会布局，包含20张10人圆桌和主舞台', tablesCount: 20, seatsPerTable: 10, hasStage: true, isPublic: true, hotCount: 134 },
  ];

  const [guests, setGuests] = useState<Guest[]>([
    { id: '1', name: '张三', tags: ['男方亲戚'], status: 'confirmed' },
    { id: '2', name: '李四', tags: ['女方亲戚'], status: 'confirmed' },
    { id: '3', name: '王五', tags: ['大学同学'], status: 'maybe' },
    { id: '4', name: '赵六', tags: ['大学同学'], status: 'confirmed' },
    { id: '5', name: '钱七', tags: ['同事'], status: 'unconfirmed' },
  ]);
  const [tables, setTables] = useState<Table[]>([
    { id: 't1', name: '桌号1', type: 'round', seatsCount: 10, x: 300, y: 200 },
    { id: 't2', name: '桌号2', type: 'round', seatsCount: 10, x: 600, y: 200 },
    { id: 't3', name: '桌号3', type: 'round', seatsCount: 10, x: 300, y: 500 },
  ]);
  const [stages, setStages] = useState<Stage[]>([]);
  const [selectedGuestIds, setSelectedGuestIds] = useState<Set<string>>(new Set());
  const [isAddGuestModalOpen, setIsAddGuestModalOpen] = useState(false);
  const [addGuestTab, setAddGuestTab] = useState<'text' | 'file'>('text');
  const [isAddTableModalOpen, setIsAddTableModalOpen] = useState(false);
  const [newTableSeats, setNewTableSeats] = useState(10);
  const [newTableCount, setNewTableCount] = useState(1);
  const [zoom, setZoom] = useState(85);
  const [activeSeat, setActiveSeat] = useState<{ tableId: string; seatIndex: number } | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [editingTableName, setEditingTableName] = useState<string | null>(null);
  const [newGuestStatus, setNewGuestStatus] = useState<'confirmed' | 'maybe' | 'unconfirmed'>('confirmed');
  const [floorPlanImage, setFloorPlanImage] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const canvasRef = useRef<HTMLDivElement>(null);

  // Batch delete function
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const deleteSelectedGuests = () => {
    if (selectedGuestIds.size === 0) return;
    setShowDeleteConfirm(true);
  };

  const confirmDelete = () => {
    setGuests(guests.filter(g => !selectedGuestIds.has(g.id)));
    setSelectedGuestIds(new Set());
    setShowDeleteConfirm(false);
  };

  const toggleGuestSelection = (id: string) => {
    const newSelection = new Set(selectedGuestIds);
    if (newSelection.has(id)) {
      newSelection.delete(id);
    } else {
      newSelection.add(id);
    }
    setSelectedGuestIds(newSelection);
  };

  const toggleAllUnassignedSelection = () => {
    if (selectedGuestIds.size === unassignedGuests.length && unassignedGuests.length > 0) {
      setSelectedGuestIds(new Set());
    } else {
      setSelectedGuestIds(new Set(unassignedGuests.map(g => g.id)));
    }
  };

  const handleExportImage = async () => {
    if (!canvasRef.current) return;
    try {
      const dataUrl = await toPng(canvasRef.current, {
        backgroundColor: '#ffffff',
        quality: 1,
        pixelRatio: 2
      });
      const link = document.createElement('a');
      link.download = `${currentProject?.name || '座位表'}.png`;
      link.href = dataUrl;
      link.click();
    } catch (err) {
      console.error('导出失败:', err);
    }
  };

  const updateTable = (id: string, updates: Partial<Table>) => {
    setTables(prev => prev.map(t => t.id === id ? { ...t, ...updates } : t));
  };

  const handleCreateProject = () => {
    const finalProjectName = projectName.trim() || `新项目 ${new Date().toLocaleDateString()}`;

    const template = templates.find(t => t.id === selectedTemplateId);
    const newProject: Project = {
      id: `p-${Date.now()}`,
      name: finalProjectName,
      remarks: projectRemarks,
      templateId: selectedTemplateId,
      createdAt: new Date().toISOString(),
    };

    setCurrentProject(newProject);
    setGuests([]); // Reset guests for new project
    setFloorPlanImage(null); // Reset floor plan
    setActiveSeat(null);

    // If template is not blank, initialize tables
    if (template && template.id !== 'blank') {
      const newTables: Table[] = [];
      const cols = 5;
      for (let i = 0; i < template.tablesCount; i++) {
        const row = Math.floor(i / cols);
        const col = i % cols;
        newTables.push({
          id: `t-${Date.now()}-${i}`,
          name: `桌号${i + 1}`,
          type: 'round',
          seatsCount: template.seatsPerTable,
          x: 200 + col * 300,
          y: 200 + row * 300,
        });
      }
      setTables(newTables);
      
      if (template.hasStage) {
        setStages([{
          id: `s-${Date.now()}`,
          name: '主舞台',
          type: 'stage',
          x: 700,
          y: 50,
          width: 600,
          height: 120
        }]);
      }
    } else {
      setTables([]);
      setStages([]);
    }

    setViewMode('seating');
  };

  // Derived state
  const unassignedGuests = useMemo(() => guests.filter(g => !g.tableId), [guests]);
  const guestsByTable = useMemo(() => {
    const map = new Map<string, Guest[]>();
    for (const guest of guests) {
      if (guest.tableId) {
        const tableGuests = map.get(guest.tableId) || [];
        tableGuests.push(guest);
        map.set(guest.tableId, tableGuests);
      }
    }
    return map;
  }, [guests]);
  
  const filteredGuests = useMemo(() => {
    const query = searchQuery.toLowerCase();
    return guests.filter(g => 
      g.name.toLowerCase().includes(query) ||
      g.tags.some(t => t.toLowerCase().includes(query))
    );
  }, [guests, searchQuery]);
  
  const handleFloorPlanAnalysis = async (base64Image: string) => {
    setIsAnalyzing(true);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: [
          {
            inlineData: {
              mimeType: "image/png",
              data: base64Image.split(',')[1],
            },
          },
          {
            text: "Analyze this hotel floor plan for a wedding. Identify the best locations for: 1. A main stage (主舞台), 2. A T-stage (T台) connected to the main stage, and 3. A set of round tables (桌子). Return a JSON object with 'stages' (array of {type: 'stage'|'t-stage', x, y, width, height}) and 'tables' (array of {name, x, y, seatsCount: 10}). Assume the canvas is 2000x2000 pixels. The main stage should be at the front, T-stage extending from it, and tables arranged in the remaining space. Provide at least 10-20 tables if space allows.",
          },
        ],
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              stages: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    type: { type: Type.STRING, enum: ['stage', 't-stage'] },
                    x: { type: Type.NUMBER },
                    y: { type: Type.NUMBER },
                    width: { type: Type.NUMBER },
                    height: { type: Type.NUMBER },
                  },
                  required: ['type', 'x', 'y', 'width', 'height'],
                },
              },
              tables: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    name: { type: Type.STRING },
                    x: { type: Type.NUMBER },
                    y: { type: Type.NUMBER },
                    seatsCount: { type: Type.NUMBER },
                  },
                  required: ['name', 'x', 'y', 'seatsCount'],
                },
              },
            },
            required: ['stages', 'tables'],
          },
        },
      });

      const result = JSON.parse(response.text || '{}');
      if (result.stages) {
        const newStages = result.stages.map((s: any, i: number) => ({
          ...s,
          id: `s-ai-${Date.now()}-${i}`,
          name: s.type === 'stage' ? '主舞台' : 'T台',
        }));
        setStages(newStages);
      }
      if (result.tables) {
        const newTables = result.tables.map((t: any, i: number) => ({
          ...t,
          id: `t-ai-${Date.now()}-${i}`,
          type: 'round',
        }));
        setTables(newTables);
      }
      setFloorPlanImage(base64Image);
    } catch (error) {
      console.error("AI Analysis failed:", error);
      alert("AI分析失败，请重试。");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleFloorPlanUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const base64 = event.target?.result as string;
      if (base64) {
        handleFloorPlanAnalysis(base64);
      }
    };
    reader.readAsDataURL(file);
  };

  const addTable = (newTable: Omit<Table, 'id' | 'x' | 'y'>) => {
    const table: Table = {
      ...newTable,
      id: `t${Date.now()}`,
      x: 500,
      y: 400,
    };
    setTables([...tables, table]);
    setIsAddTableModalOpen(false);
  };

  const addStage = (type: 'stage' | 't-stage') => {
    const newStage: Stage = {
      id: `s${Date.now()}`,
      name: type === 'stage' ? '主舞台' : 'T台',
      type,
      x: 400,
      y: 100,
      width: type === 'stage' ? 400 : 100,
      height: type === 'stage' ? 150 : 300,
    };
    setStages([...stages, newStage]);
  };

  const updateStage = (id: string, updates: Partial<Stage>) => {
    setStages(stages.map(s => s.id === id ? { ...s, ...updates } : s));
  };

  const deleteStage = (id: string) => {
    setStages(stages.filter(s => s.id !== id));
  };

  const deleteTable = (id: string) => {
    setTables(tables.filter(t => t.id !== id));
    setGuests(guests.map(g => g.tableId === id ? { ...g, tableId: undefined, seatIndex: undefined } : g));
  };

  const deleteGuest = (id: string) => {
    setGuests(guests.filter(g => g.id !== id));
  };

  const unassignGuest = (id: string) => {
    setGuests(guests.map(g => g.id === id ? { ...g, tableId: undefined, seatIndex: undefined } : g));
  };

  const addGuestsBulk = (text: string) => {
    const lines = text.split('\n').filter(l => l.trim());
    const newGuests: Guest[] = lines.map((line, index) => {
      const parts = line.split(':');
      const name = parts[0]?.trim() || '未命名';
      const tag = parts[1]?.trim();
      const status = (parts[2]?.trim() as any) || 'confirmed';
      return {
        id: `g${Date.now()}-${index}`,
        name,
        tags: tag ? [tag] : [],
        status,
      };
    });
    setGuests([...guests, ...newGuests]);
    setIsAddGuestModalOpen(false);
  };

  const handleAutoSeating = () => {
    const suggested = suggestSeating(guests, tables);
    setGuests(suggested);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      if (text) {
        // Simple CSV parsing: skip header, then parse lines
        const lines = text.split('\n').filter(l => l.trim());
        const dataLines = lines.slice(1); // Assume first line is header
        const formattedText = dataLines.map(line => {
          const parts = line.split(',').map(p => p.trim());
          const name = parts[0] || '';
          const tag = parts[1] || '';
          return `${name}:${tag}`;
        }).join('\n');
        addGuestsBulk(formattedText);
      }
    };
    reader.readAsText(file);
  };

  const downloadCSVTemplate = () => {
    const headers = '姓名,标签,状态\n';
    const rows = [
      '张三,男方亲戚,confirmed',
      '李四,女方亲戚,confirmed',
      '王五,大学同学,maybe',
      '赵六,同事,unconfirmed',
    ].join('\n');
    
    const csvContent = headers + rows;
    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', '婚宴宾客导入模板.csv');
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const assignGuestToSeat = (guestId: string, tableId: string, seatIndex: number) => {
    const guest = guests.find(g => g.id === guestId);
    const table = tables.find(t => t.id === tableId);
    if (!guest || !table) return;

    // Check if seat is already occupied
    const occupiedSeat = guests.find(g => g.tableId === tableId && g.seatIndex === seatIndex);
    if (occupiedSeat) return;

    const newGuests = guests.map(g => {
      if (g.id === guestId) {
        return { ...g, tableId, seatIndex };
      }
      return g;
    });
    setGuests(newGuests);

    // Auto-advance to next seat
    if (table) {
      const nextIndex = seatIndex + 1;
      // Only advance if the next seat is within bounds
      if (nextIndex < table.seatsCount) {
        setActiveSeat({ tableId, seatIndex: nextIndex });
      } else {
        setActiveSeat(null);
      }
    }
  };

  const filteredUnassignedGuests = useMemo(() => {
    return unassignedGuests.filter(g => 
      g.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      g.tags.some(t => t.toLowerCase().includes(searchQuery.toLowerCase()))
    );
  }, [unassignedGuests, searchQuery]);

  const filteredTemplates = useMemo(() => {
    const query = templateSearchQuery.toLowerCase();
    return templates.filter(t => 
      t.name.toLowerCase().includes(query) ||
      t.description.toLowerCase().includes(query)
    );
  }, [templates, templateSearchQuery]);

  if (viewMode === 'setup') {
    const selectedTemplate = templates.find(t => t.id === selectedTemplateId);

    return (
      <div className="fixed inset-0 bg-gray-100 flex items-center justify-center p-8 z-50 overflow-hidden font-sans">
        <div className="bg-white w-full max-w-7xl h-full max-h-[900px] rounded-2xl shadow-2xl flex overflow-hidden border border-gray-200">
          {/* Left Sidebar: Project Info */}
          <div className="w-80 border-r border-gray-100 p-8 flex flex-col bg-white">
            <h1 className="text-2xl font-bold text-gray-900 mb-2">新建项目</h1>
            <p className="text-sm text-gray-500 mb-8">填写项目信息并选择模板</p>

            <div className="space-y-6 flex-1">
              <div className="space-y-2">
                <label className="text-sm font-semibold text-gray-700 flex items-center gap-1">
                  项目名称 <span className="text-red-500">*</span>
                </label>
                <input 
                  type="text" 
                  placeholder="例如：王小明李小红婚宴"
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all outline-none text-sm"
                  value={projectName}
                  onChange={(e) => setProjectName(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-semibold text-gray-700">备注</label>
                <textarea 
                  placeholder="添加备注信息..."
                  rows={6}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all outline-none text-sm resize-none"
                  value={projectRemarks}
                  onChange={(e) => setProjectRemarks(e.target.value)}
                />
              </div>
            </div>

            <div className="pt-8 space-y-3">
              <button 
                onClick={handleCreateProject}
                className="w-full py-4 rounded-xl font-bold text-white transition-all shadow-lg shadow-blue-500/20 bg-blue-600 hover:bg-blue-700 hover:-translate-y-0.5 active:translate-y-0"
              >
                创建项目
              </button>
              <button 
                onClick={() => {
                  if (currentProject) {
                    setViewMode('seating');
                  }
                }}
                className="w-full py-4 rounded-xl font-bold text-gray-500 hover:bg-gray-50 transition-all"
              >
                取消
              </button>
            </div>
          </div>

          {/* Center: Template Selection */}
          <div className="flex-1 bg-gray-50/50 p-8 flex flex-col overflow-hidden">
            <div className="flex items-center justify-between mb-8">
              <h2 className="text-xl font-bold text-gray-900">选择模板</h2>
              <div className="flex items-center gap-3">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input 
                    type="text" 
                    placeholder="搜索模板..."
                    className="pl-10 pr-4 py-2 bg-white rounded-lg border border-gray-200 text-sm focus:ring-2 focus:ring-blue-500 outline-none w-64"
                    value={templateSearchQuery}
                    onChange={(e) => setTemplateSearchQuery(e.target.value)}
                  />
                </div>
                <button className="p-2 bg-white rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors">
                  <Filter className="w-4 h-4 text-gray-600" />
                </button>
                <button className="flex items-center gap-2 px-3 py-2 bg-white rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors text-sm text-gray-600">
                  <span>最新</span>
                  <ChevronDown className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
              <div className="grid grid-cols-2 gap-6">
                {filteredTemplates.map(template => (
                  <div 
                    key={template.id}
                    onClick={() => setSelectedTemplateId(template.id)}
                    onDoubleClick={handleCreateProject}
                    className={cn(
                      "group relative bg-white rounded-2xl border-2 p-1 transition-all cursor-pointer overflow-hidden",
                      selectedTemplateId === template.id ? "border-blue-500 ring-4 ring-blue-500/10" : "border-transparent hover:border-gray-200"
                    )}
                  >
                    <div className="aspect-[4/3] bg-gray-100 rounded-xl mb-4 flex items-center justify-center relative overflow-hidden">
                      {template.id === 'blank' ? (
                        <div className="flex flex-col items-center gap-4 text-gray-400">
                          <div className="w-16 h-16 rounded-full border-2 border-dashed border-gray-300 flex items-center justify-center">
                            <Plus className="w-8 h-8" />
                          </div>
                          <span className="text-sm font-medium">从零开始</span>
                        </div>
                      ) : (
                        <div className="grid grid-cols-4 gap-2 opacity-20">
                          {Array.from({ length: 16 }).map((_, i) => (
                            <div key={i} className="w-8 h-8 rounded-full bg-gray-400" />
                          ))}
                        </div>
                      )}
                      
                      {template.hotCount > 0 && (
                        <div className="absolute top-3 left-3 px-2 py-1 bg-white/90 backdrop-blur rounded-full flex items-center gap-1 text-[10px] font-bold text-orange-500 shadow-sm">
                          <Flame className="w-3 h-3" />
                          <span>{template.hotCount}</span>
                        </div>
                      )}
                      
                      {template.isPublic && (
                        <div className="absolute top-3 right-3 px-2 py-1 bg-gray-800/80 backdrop-blur rounded-full text-[10px] font-bold text-white">
                          公开
                        </div>
                      )}
                    </div>
                    
                    <div className="p-4">
                      <h3 className="font-bold text-gray-900 mb-1">{template.name}</h3>
                      <div className="flex items-center gap-3 text-[10px] text-gray-500">
                        <span className="flex items-center gap-1"><TableIcon className="w-3 h-3" /> {template.tablesCount > 0 ? `${template.tablesCount}桌` : '--'}</span>
                        <span className="flex items-center gap-1"><Users className="w-3 h-3" /> {template.seatsPerTable > 0 ? `${template.seatsPerTable}人/桌` : '--'}</span>
                        <span className="flex items-center gap-1"><LayoutGrid className="w-3 h-3" /> {template.hasStage ? '舞台' : '--'}</span>
                      </div>
                      <div className="mt-3 text-[10px] text-gray-400">by 排排坐.online</div>
                    </div>

                    {selectedTemplateId === template.id && (
                      <div className="absolute inset-0 bg-blue-500/5 flex items-center justify-center pointer-events-none">
                        <div className="bg-blue-500 text-white p-1 rounded-full shadow-lg">
                          <CheckCircle2 className="w-5 h-5" />
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right Sidebar: Template Details */}
          <div className="w-80 border-l border-gray-100 p-8 flex flex-col bg-white">
            <div className="flex items-center justify-between mb-8">
              <h2 className="text-xl font-bold text-gray-900">模板详情</h2>
              <button className="p-1 text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            {selectedTemplate ? (
              <div className="flex-1 flex flex-col items-center justify-center text-center">
                <div className="w-32 h-32 bg-gray-50 rounded-2xl border-2 border-dashed border-gray-200 flex items-center justify-center mb-6">
                  <Plus className="w-10 h-10 text-gray-300" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">{selectedTemplate.name}</h3>
                <p className="text-sm text-gray-500 leading-relaxed px-4 mb-8">
                  {selectedTemplate.description}
                </p>
                <button 
                  onClick={handleCreateProject}
                  className="px-8 py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-all shadow-lg shadow-blue-500/20"
                >
                  立即使用此模板
                </button>
              </div>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-gray-400">
                <LayoutGrid className="w-12 h-12 mb-4 opacity-20" />
                <p className="text-sm">请选择一个模板查看详情</p>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen w-full bg-[#f8f9fa] overflow-hidden font-sans text-gray-900">
      {/* Sidebar */}
      <aside className="w-72 bg-white border-r border-gray-200 flex flex-col shadow-sm z-10 relative">
        <AnimatePresence>
          {activeSeat && (
            <motion.div 
              initial={{ x: -300 }}
              animate={{ x: 0 }}
              exit={{ x: -300 }}
              className="absolute inset-0 bg-white z-40 flex flex-col border-r border-gray-200 shadow-xl"
            >
              <div className="p-4 border-b border-gray-100 flex items-center justify-between bg-gray-50">
                <div>
                  <h3 className="font-bold text-sm">选择宾客</h3>
                  <p className="text-[10px] text-gray-500">正在为 {tables.find(t => t.id === activeSeat.tableId)?.name} 第 {activeSeat.seatIndex + 1} 位安排</p>
                </div>
                <button onClick={() => setActiveSeat(null)} className="p-1 hover:bg-gray-200 rounded-full">
                  <X className="w-4 h-4 text-gray-400" />
                </button>
              </div>
              
              <div className="p-3">
                <div className="relative">
                  <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-gray-400" />
                  <input 
                    type="text" 
                    placeholder="搜索宾客..." 
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-7 pr-3 py-1.5 bg-gray-100 border-none rounded-md text-xs focus:ring-1 focus:ring-gray-300"
                  />
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-2 space-y-1">
                {filteredUnassignedGuests.length === 0 ? (
                  <div className="text-center py-10 text-gray-400 text-xs italic">
                    没有找到匹配的宾客
                  </div>
                ) : (
                  filteredUnassignedGuests.map(guest => (
                    <button 
                      key={guest.id}
                      onClick={() => assignGuestToSeat(guest.id, activeSeat.tableId, activeSeat.seatIndex)}
                      className="w-full text-left p-2 hover:bg-blue-50 rounded-md transition-colors group border border-transparent hover:border-blue-100"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-gray-700 group-hover:text-blue-600">{guest.name}</span>
                      </div>
                      {guest.tags.length > 0 && (
                        <div className="flex gap-1 mt-1">
                          {guest.tags.map(tag => (
                            <span key={tag} className="text-[9px] px-1 bg-gray-100 text-gray-500 rounded">{tag}</span>
                          ))}
                        </div>
                      )}
                    </button>
                  ))
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="p-4 border-b border-gray-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-gray-600" />
            <h2 className="font-semibold text-sm">宾客列表</h2>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1 text-xs text-gray-400">
              <TableIcon className="w-3 h-3" />
              <span>{tables.length}</span>
            </div>
            <div className="flex items-center gap-1 text-xs text-gray-400">
              <Users className="w-3 h-3" />
              <span>{guests.length}</span>
            </div>
            <button 
              onClick={() => setIsAddGuestModalOpen(true)}
              className="p-1 bg-gray-800 text-white rounded hover:bg-gray-700 transition-colors"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-6">
          {/* Unassigned Guests */}
          <section>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2 text-sm font-medium text-gray-600">
                <ChevronDown className="w-4 h-4" />
                <span>待安排座位 ({unassignedGuests.length})</span>
              </div>
              {activeSeat ? (
                <button 
                  onClick={() => setActiveSeat(null)}
                  className="text-[10px] text-blue-600 hover:underline font-medium"
                >
                  取消选择
                </button>
              ) : (
                <div className="flex items-center gap-2">
                  {selectedGuestIds.size > 0 && (
                    <button 
                      onClick={deleteSelectedGuests}
                      className="text-[10px] text-red-600 hover:underline font-medium"
                    >
                      批量删除({selectedGuestIds.size})
                    </button>
                  )}
                  <input 
                    type="checkbox" 
                    className="rounded border-gray-300 cursor-pointer" 
                    checked={unassignedGuests.length > 0 && selectedGuestIds.size === unassignedGuests.length}
                    onChange={toggleAllUnassignedSelection}
                  />
                </div>
              )}
            </div>
            
            {activeSeat && (
              <div className="mb-4 p-2 bg-blue-50 border border-blue-100 rounded-lg text-[10px] text-blue-600 flex items-center gap-2 animate-pulse">
                <Sparkles className="w-3 h-3" />
                <span>请在下方选择一位宾客安排到选中座位</span>
              </div>
            )}
            
            {unassignedGuests.length === 0 ? (
              <div className="text-center py-8 text-gray-400 text-xs">
                暂无待安排宾客
              </div>
            ) : (
              <div className="space-y-2">
                {unassignedGuests.map(guest => (
                  <motion.div 
                    key={guest.id} 
                    drag={!activeSeat}
                    dragSnapToOrigin
                    dragMomentum={false}
                    onDragEnd={(_, info) => {
                      // Calculate drop position relative to canvas
                      // This is a bit simplified, but we can check if it's over a table
                      const canvas = document.querySelector('.canvas-container');
                      if (!canvas) return;
                      const rect = canvas.getBoundingClientRect();
                      const dropX = (info.point.x - rect.left) / (zoom / 100);
                      const dropY = (info.point.y - rect.top) / (zoom / 100);

                      // Find table under drop point
                      const droppedTable = tables.find(t => {
                        const dist = Math.sqrt(Math.pow(t.x + 96 - dropX, 2) + Math.pow(t.y + 96 - dropY, 2));
                        return dist < 120; // Table radius + some buffer
                      });

                      if (droppedTable) {
                        // Find first available seat index
                        const tableGuests = guests.filter(g => g.tableId === droppedTable.id);
                        const occupiedIndices = new Set(tableGuests.map(g => g.seatIndex));
                        let firstAvailableIndex = -1;
                        for (let i = 0; i < droppedTable.seatsCount; i++) {
                          if (!occupiedIndices.has(i)) {
                            firstAvailableIndex = i;
                            break;
                          }
                        }

                        if (firstAvailableIndex !== -1) {
                          setGuests(guests.map(g => g.id === guest.id ? { ...g, tableId: droppedTable.id, seatIndex: firstAvailableIndex } : g));
                        }
                      }
                    }}
                    onClick={() => {
                      if (activeSeat) {
                        assignGuestToSeat(guest.id, activeSeat.tableId, activeSeat.seatIndex);
                      }
                    }}
                    className={cn(
                      "flex flex-col gap-1 p-2 rounded border text-sm group relative transition-all",
                      activeSeat ? "cursor-pointer hover:border-blue-300 hover:bg-blue-50 border-blue-100 bg-white" : "cursor-grab active:cursor-grabbing bg-gray-50 border-gray-100",
                      selectedGuestIds.has(guest.id) && "border-blue-400 bg-blue-50/50"
                    )}
                  >
                    <div className="flex items-center gap-2">
                      <div className="flex items-center gap-2 flex-1">
                        {!activeSeat && (
                          <input 
                            type="checkbox" 
                            className="rounded border-gray-300 cursor-pointer" 
                            checked={selectedGuestIds.has(guest.id)}
                            onChange={(e) => {
                              e.stopPropagation();
                              toggleGuestSelection(guest.id);
                            }}
                            onClick={(e) => e.stopPropagation()}
                          />
                        )}
                        <GripVertical className="w-4 h-4 text-gray-300" />
                        <span className="flex-1 font-medium">{guest.name}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        {activeSeat && (
                          <div className="px-2 py-0.5 bg-blue-600 text-white rounded text-[10px] font-bold opacity-0 group-hover:opacity-100 transition-opacity">
                            安排到此座
                          </div>
                        )}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteGuest(guest.id);
                          }}
                          className="opacity-0 group-hover:opacity-100 p-1 hover:bg-red-50 text-gray-400 hover:text-red-500 rounded transition-all"
                          title="删除宾客"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-1 ml-6">
                      {guest.status && (
                        <span className={cn(
                          "px-1.5 py-0.5 rounded text-[10px] border",
                          guest.status === 'confirmed' ? "bg-green-50 text-green-600 border-green-100" :
                          guest.status === 'maybe' ? "bg-yellow-50 text-yellow-600 border-yellow-100" :
                          "bg-gray-50 text-gray-400 border-gray-100"
                        )}>
                          {guest.status === 'confirmed' ? '必来' : guest.status === 'maybe' ? '未必' : '未确认'}
                        </span>
                      )}
                      {guest.tags.map(tag => (
                        <span key={tag} className="px-1.5 py-0.5 bg-blue-50 text-blue-500 rounded text-[10px] border border-blue-100">
                          {tag}
                        </span>
                      ))}
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </section>

          {/* Tables List */}
          <section>
            {tables.map(table => {
              const tableGuests = guests.filter(g => g.tableId === table.id);
              const currentCount = tableGuests.length;
              
              return (
                <div key={table.id} className="mb-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2 text-sm font-medium text-gray-600">
                      <ChevronRight className="w-4 h-4" />
                      <span>{table.name} ({tableGuests.length}/{table.seatsCount})</span>
                    </div>
                    <input type="checkbox" className="rounded border-gray-300" />
                  </div>
                  {tableGuests.length > 0 && (
                    <div className="ml-6 space-y-1">
                      {tableGuests.map(g => (
                        <div key={g.id} className="text-xs text-gray-500 flex justify-between items-center bg-white p-1.5 rounded border border-gray-50">
                          <span>{g.name}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </section>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col relative overflow-hidden">
        {/* Header */}
        <header className="h-14 bg-white border-b border-gray-200 flex items-center justify-between px-6 z-10 shadow-sm">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setViewMode('setup')}
              className="p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-500 hover:text-gray-900"
              title="返回项目设置"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <h1 className="text-lg font-bold text-gray-900 border-r pr-4 border-gray-200">{currentProject?.name || '未命名项目'}</h1>
            <div className="flex items-center gap-6">
              <button className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                <Undo2 className="w-4 h-4 text-gray-600" />
              </button>
              <button className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                <Redo2 className="w-4 h-4 text-gray-600" />
              </button>
              <div className="flex items-center gap-2 text-green-500 text-sm font-medium">
                <Save className="w-4 h-4" />
                <span>已保存</span>
              </div>
            </div>
          </div>

          <div className="flex items-center bg-gray-100 p-1 rounded-lg">
            <button 
              onClick={() => setViewMode('seating')}
              className={cn(
                "px-4 py-1.5 text-sm font-medium rounded-md transition-all",
                viewMode === 'seating' ? "bg-white shadow-sm text-gray-900" : "text-gray-500 hover:text-gray-700"
              )}
            >
              排座视图
            </button>
            <button 
              onClick={() => setViewMode('table')}
              className={cn(
                "px-4 py-1.5 text-sm font-medium rounded-md transition-all",
                viewMode === 'table' ? "bg-white shadow-sm text-gray-900" : "text-gray-500 hover:text-gray-700"
              )}
            >
              宾客表格
            </button>
          </div>

          <div className="flex items-center gap-3">
            <button 
              onClick={() => {
                setProjectName('');
                setProjectRemarks('');
                setSelectedTemplateId('blank');
                setViewMode('setup');
              }}
              className="flex items-center gap-2 px-4 py-1.5 bg-white border border-gray-200 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors shadow-sm"
            >
              <Plus className="w-4 h-4" />
              <span>新建项目</span>
            </button>
            <button 
              onClick={handleExportImage}
              className="flex items-center gap-2 px-4 py-1.5 border border-gray-200 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors"
            >
              <Download className="w-4 h-4" />
              <span>导出图片</span>
            </button>
            <button 
              onClick={() => window.print()}
              className="flex items-center gap-2 px-4 py-1.5 border border-gray-200 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors"
            >
              <PlusIcon className="w-4 h-4 rotate-45" />
              <span>打印 PDF</span>
            </button>
            <div className="flex items-center gap-1 border border-gray-200 rounded-lg p-1">
              <button 
                onClick={() => addStage('stage')}
                className="flex items-center gap-2 px-3 py-1 hover:bg-gray-50 rounded text-sm font-medium transition-colors"
              >
                <div className="w-3 h-3 border-2 border-gray-400 rounded-sm" />
                <span>添加舞台</span>
              </button>
              <button 
                onClick={() => addStage('t-stage')}
                className="flex items-center gap-2 px-3 py-1 hover:bg-gray-50 rounded text-sm font-medium transition-colors border-l border-gray-100"
              >
                <div className="w-2 h-4 border-2 border-gray-400 rounded-sm" />
                <span>添加T台</span>
              </button>
            </div>
            <button 
              onClick={handleAutoSeating}
              className="flex items-center gap-2 px-4 py-1.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors shadow-sm"
            >
              <Sparkles className="w-4 h-4" />
              <span>智能排座</span>
            </button>
            <button 
              onClick={() => setIsAddTableModalOpen(true)}
              className="flex items-center gap-2 px-4 py-1.5 bg-gray-800 text-white rounded-lg text-sm font-medium hover:bg-gray-700 transition-colors shadow-sm"
            >
              <Plus className="w-4 h-4" />
              <span>添加桌子</span>
            </button>

            <div className="relative">
              <input 
                type="file" 
                id="floor-plan-upload" 
                className="hidden" 
                accept="image/*"
                onChange={handleFloorPlanUpload}
                disabled={isAnalyzing}
              />
              <label 
                htmlFor="floor-plan-upload"
                className={cn(
                  "flex items-center gap-2 px-4 py-1.5 bg-purple-600 text-white rounded-lg text-sm font-medium hover:bg-purple-700 transition-colors shadow-sm cursor-pointer",
                  isAnalyzing && "opacity-50 cursor-not-allowed"
                )}
              >
                {isAnalyzing ? <Loader2 className="w-4 h-4 animate-spin" /> : <ImageIcon className="w-4 h-4" />}
                <span>AI 导入平面图</span>
              </label>
            </div>

            {floorPlanImage && (
              <button 
                onClick={() => setFloorPlanImage(null)}
                className="flex items-center gap-2 px-3 py-1.5 bg-red-50 text-red-600 rounded-lg text-xs font-medium hover:bg-red-100 transition-colors border border-red-100"
              >
                <Trash2 className="w-3 h-3" />
                <span>清除底图</span>
              </button>
            )}
            
            <div className="flex items-center gap-2 ml-4 border-l pl-4 border-gray-200">
              <button onClick={() => setZoom(z => Math.max(10, z - 5))} className="p-1 hover:bg-gray-100 rounded">
                <Minus className="w-4 h-4 text-gray-400" />
              </button>
              <span className="text-xs font-medium text-gray-500 w-8 text-center">{zoom}%</span>
              <button onClick={() => setZoom(z => Math.min(200, z + 5))} className="p-1 hover:bg-gray-100 rounded">
                <PlusIcon className="w-4 h-4 text-gray-400" />
              </button>
            </div>
          </div>
        </header>

        {/* Canvas Area */}
        <div className="flex-1 relative overflow-hidden bg-white canvas-container">
          {/* Legend */}
          <div className="absolute top-4 left-4 z-20 bg-white/80 backdrop-blur-sm border border-gray-200 rounded-lg p-3 shadow-sm space-y-2">
            <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">图例</div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded bg-blue-50 border border-blue-200" />
                <span className="text-[10px] text-gray-600">男方</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded bg-pink-50 border border-pink-200" />
                <span className="text-[10px] text-gray-600">女方</span>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded bg-green-50 border border-green-200" />
                <span className="text-[10px] text-gray-600">必来</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded bg-yellow-50 border border-yellow-200" />
                <span className="text-[10px] text-gray-600">未必</span>
              </div>
            </div>
          </div>

          {viewMode === 'seating' ? (
            <div 
              ref={canvasRef}
              className="absolute inset-0 overflow-auto"
              style={{
                backgroundImage: floorPlanImage ? `url(${floorPlanImage})` : 'radial-gradient(#e5e7eb 1px, transparent 1px)',
                backgroundSize: floorPlanImage ? 'contain' : '20px 20px',
                backgroundRepeat: 'no-repeat',
                backgroundPosition: 'center',
                transform: `scale(${zoom / 100})`,
                transformOrigin: '0 0'
              }}
            >
              <div className="min-w-[2000px] min-h-[2000px] relative">
                {/* Stages */}
                {stages.map(stage => (
                  <motion.div
                    key={stage.id}
                    drag
                    dragMomentum={false}
                    dragElastic={0}
                    whileDrag={{ zIndex: 100, scale: 1.02, opacity: 0.8 }}
                    onDragEnd={(_, info) => {
                      updateStage(stage.id, { x: stage.x + info.offset.x, y: stage.y + info.offset.y });
                    }}
                    className="absolute cursor-move group"
                    style={{ x: stage.x, y: stage.y, left: 0, top: 0, width: stage.width, height: stage.height }}
                  >
                    <div className={cn(
                      "w-full h-full border-2 flex flex-col items-center justify-center shadow-md relative",
                      stage.type === 'stage' ? "bg-purple-50 border-purple-300" : "bg-blue-50 border-blue-300"
                    )} style={{ backgroundColor: stage.color }}>
                      <span className="text-sm font-bold text-gray-600 uppercase tracking-wide">{stage.name}</span>
                      <div className="flex items-center gap-1 mt-1 bg-white/50 px-1.5 py-0.5 rounded border border-gray-200/50">
                        <Maximize2 className="w-2.5 h-2.5 text-gray-400" />
                        <span className="text-[10px] font-mono text-gray-500">{(stage.width / 100).toFixed(1)}m × {(stage.height / 100).toFixed(1)}m</span>
                      </div>

                      {/* Stage Controls */}
                      <div className="absolute -bottom-10 left-1/2 -translate-x-1/2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity bg-white/90 backdrop-blur border border-gray-200 rounded-full px-2 py-1 shadow-sm z-30">
                        <div className="flex gap-1">
                          {['#f5f3ff', '#eff6ff', '#f0fdf4', '#fff7ed', '#fef2f2'].map(c => (
                            <button
                              key={c}
                              onClick={() => updateStage(stage.id, { color: c })}
                              className="w-4 h-4 rounded-full border border-gray-200"
                              style={{ backgroundColor: c }}
                            />
                          ))}
                        </div>
                      </div>
                      
                      {/* Resize Handle */}
                      <div 
                        className="absolute bottom-0 right-0 w-6 h-6 cursor-nwse-resize flex items-end justify-end p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                        onMouseDown={(e) => {
                          e.stopPropagation();
                          const startX = e.clientX;
                          const startY = e.clientY;
                          const startWidth = stage.width;
                          const startHeight = stage.height;
                          
                          const onMouseMove = (moveEvent: MouseEvent) => {
                            const deltaX = (moveEvent.clientX - startX) / (zoom / 100);
                            const deltaY = (moveEvent.clientY - startY) / (zoom / 100);
                            updateStage(stage.id, { 
                              width: Math.max(50, startWidth + deltaX), 
                              height: Math.max(50, startHeight + deltaY) 
                            });
                          };
                          
                          const onMouseUp = () => {
                            document.removeEventListener('mousemove', onMouseMove);
                            document.removeEventListener('mouseup', onMouseUp);
                          };
                          
                          document.addEventListener('mousemove', onMouseMove);
                          document.addEventListener('mouseup', onMouseUp);
                        }}
                      >
                        <div className="w-3 h-3 border-r-2 border-b-2 border-gray-400 rounded-br-sm" />
                      </div>

                      {/* Delete Button */}
                      <button 
                        onClick={() => deleteStage(stage.id)}
                        className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-sm"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  </motion.div>
                ))}

                {tables.map(table => (
                  <TableComponent
                    key={table.id}
                    table={table}
                    tableGuests={guestsByTable.get(table.id) || []}
                    activeSeat={activeSeat}
                    zoom={zoom}
                    editingTableName={editingTableName}
                    setEditingTableName={setEditingTableName}
                    onSeatClick={(i) => setActiveSeat({ tableId: table.id, seatIndex: i })}
                    onTableMove={(id, x, y) => setTables(tables.map(t => t.id === id ? { ...t, x, y } : t))}
                    onTableDelete={deleteTable}
                    onTableNameChange={(id, name) => setTables(tables.map(t => t.id === id ? { ...t, name } : t))}
                    onTableUpdate={updateTable}
                    onUnassignGuest={unassignGuest}
                  />
                ))}
              </div>
            </div>
          ) : (
            <div className="p-8 h-full flex flex-col overflow-hidden">
              <div className="flex items-center gap-4 mb-6">
                <button 
                  onClick={() => setIsAddGuestModalOpen(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-gray-800 text-white rounded-lg text-sm font-medium hover:bg-gray-700 transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  <span>添加宾客</span>
                </button>
                <div className="relative flex-1 max-w-md">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input 
                    type="text" 
                    placeholder="搜索姓名、标签..." 
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-200"
                  />
                </div>
              </div>

              <div className="flex-1 border border-gray-200 rounded-xl overflow-hidden bg-white shadow-sm flex flex-col">
                <div className="grid grid-cols-5 gap-4 p-4 bg-gray-50 border-b border-gray-200 text-xs font-bold text-gray-500 uppercase tracking-wider">
                  <div className="col-span-2">姓名</div>
                  <div>状态</div>
                  <div>标签</div>
                  <div>桌号</div>
                </div>
                <div className="flex-1 overflow-y-auto">
                  {filteredGuests.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-64 text-gray-400">
                      <Users className="w-12 h-12 mb-4 opacity-20" />
                      <p className="text-sm">没有找到匹配的宾客</p>
                    </div>
                  ) : (
                    filteredGuests.map(guest => (
                      <div key={guest.id} className="grid grid-cols-5 gap-4 p-4 border-b border-gray-100 items-center hover:bg-gray-50 transition-colors text-sm">
                        <div className="col-span-2 font-medium text-gray-900">{guest.name}</div>
                        <div>
                          <select 
                            value={guest.status || 'unconfirmed'}
                            onChange={(e) => setGuests(guests.map(g => g.id === guest.id ? { ...g, status: e.target.value as any } : g))}
                            className={cn(
                              "text-xs px-2 py-1 rounded border-none focus:ring-1 focus:ring-gray-200 cursor-pointer",
                              guest.status === 'confirmed' ? "bg-green-50 text-green-600" :
                              guest.status === 'maybe' ? "bg-yellow-50 text-yellow-600" :
                              "bg-gray-50 text-gray-400"
                            )}
                          >
                            <option value="confirmed">必来</option>
                            <option value="maybe">未必</option>
                            <option value="unconfirmed">未确认</option>
                          </select>
                        </div>
                        <div className="flex flex-wrap gap-1">
                          {guest.tags.map(tag => (
                            <span key={tag} className="px-1.5 py-0.5 bg-blue-50 text-blue-500 rounded text-[10px] border border-blue-100">
                              {tag}
                            </span>
                          ))}
                        </div>
                        <div className="flex items-center justify-between text-gray-500 group">
                          <span>{tables.find(t => t.id === guest.tableId)?.name || '未安排'}</span>
                          <button
                            onClick={() => deleteGuest(guest.id)}
                            className="p-1 hover:bg-red-50 text-gray-400 hover:text-red-500 rounded opacity-0 group-hover:opacity-100 transition-all"
                            title="删除宾客"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Mini Map */}
        <div className="absolute bottom-6 right-6 w-48 h-32 bg-white border border-gray-200 rounded-lg shadow-xl overflow-hidden z-20 opacity-90 hover:opacity-100 transition-opacity">
          <div className="w-full h-full bg-gray-50 relative">
            <div className="absolute w-4 h-3 border-2 border-blue-500 rounded-sm bg-blue-500/10" style={{ left: '45%', top: '45%' }} />
          </div>
        </div>
      </main>

      {/* Modals */}
      <AnimatePresence>
        {isAddGuestModalOpen && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-xl shadow-2xl w-full max-w-xl overflow-hidden"
            >
              <div className="p-6 border-b border-gray-100 flex items-center justify-between">
                <div>
                  <h3 className="text-xl font-bold">添加宾客</h3>
                  <p className="text-sm text-gray-500 mt-1">支持批量文本粘贴或文件导入</p>
                </div>
                <button onClick={() => setIsAddGuestModalOpen(false)} className="p-2 hover:bg-gray-100 rounded-full">
                  <X className="w-5 h-5 text-gray-400" />
                </button>
              </div>
              
              <div className="p-6">
                <div className="flex bg-gray-100 p-1 rounded-lg mb-6">
                  <button 
                    onClick={() => setAddGuestTab('text')}
                    className={cn(
                      "flex-1 py-2 text-sm font-medium rounded-md transition-all",
                      addGuestTab === 'text' ? "bg-white shadow-sm text-gray-900" : "text-gray-500"
                    )}
                  >
                    批量文本
                  </button>
                  <button 
                    onClick={() => setAddGuestTab('file')}
                    className={cn(
                      "flex-1 py-2 text-sm font-medium rounded-md transition-all",
                      addGuestTab === 'file' ? "bg-white shadow-sm text-gray-900" : "text-gray-500"
                    )}
                  >
                    文件上传
                  </button>
                </div>
                
                {addGuestTab === 'text' ? (
                  <>
                    <div className="flex items-center gap-4 mb-4">
                      <span className="text-sm font-medium text-gray-700">默认状态:</span>
                      <div className="flex gap-2">
                        {(['confirmed', 'maybe', 'unconfirmed'] as const).map(status => (
                          <button
                            key={status}
                            onClick={() => setNewGuestStatus(status)}
                            className={cn(
                              "px-3 py-1 rounded-full text-xs border transition-all",
                              newGuestStatus === status 
                                ? "bg-gray-800 text-white border-gray-800" 
                                : "bg-white text-gray-500 border-gray-200 hover:border-gray-300"
                            )}
                          >
                            {status === 'confirmed' ? '必来' : status === 'maybe' ? '未必' : '未确认'}
                          </button>
                        ))}
                      </div>
                    </div>
                    <p className="text-xs text-gray-500 mb-2">每行输入一个宾客姓名，可以使用冒号或括号指定标签和状态（如：张三:男方亲戚:confirmed 或 李四(未必)）</p>
                    <textarea 
                      id="bulk-guest-input"
                      className="w-full h-64 p-4 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-200 resize-none font-mono"
                      placeholder="例如：&#10;张三:男方亲戚:confirmed&#10;李四(未必)&#10;王五:大学同学:unconfirmed"
                    />
                  </>
                ) : (
                  <div className="space-y-4">
                    <div className="bg-blue-50/50 border border-blue-100 rounded-lg p-4 text-xs text-gray-600 leading-relaxed">
                      <div className="flex gap-2 mb-2">
                        <div className="w-4 h-4 bg-blue-500 text-white rounded-full flex items-center justify-center text-[10px] shrink-0">i</div>
                        <p className="font-bold text-blue-700">支持列：姓名（必填）、标签、状态</p>
                      </div>
                      <ul className="list-disc list-inside space-y-1 ml-6 text-gray-500">
                        <li>标签列按单个标签导入</li>
                        <li>状态可选值：confirmed (必来), maybe (未必), unconfirmed (未确认)</li>
                        <li>CSV 文件：UTF-8 编码</li>
                      </ul>
                    </div>

                    <div className="flex gap-3">
                      <button 
                        onClick={downloadCSVTemplate}
                        className="flex-1 flex items-center justify-center gap-2 py-2.5 border border-gray-200 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors"
                      >
                        <Download className="w-4 h-4" />
                        <span>下载 CSV 模板</span>
                      </button>
                      <button 
                        onClick={downloadCSVTemplate}
                        className="flex-1 flex items-center justify-center gap-2 py-2.5 border border-gray-200 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors"
                      >
                        <Download className="w-4 h-4" />
                        <span>下载 Excel 模板</span>
                      </button>
                    </div>

                    <label className="block w-full border-2 border-dashed border-gray-200 rounded-xl p-12 text-center cursor-pointer hover:border-gray-300 hover:bg-gray-50 transition-all">
                      <input type="file" className="hidden" accept=".csv,.txt" onChange={handleFileUpload} />
                      <div className="flex flex-col items-center gap-4">
                        <div className="w-12 h-12 bg-gray-100 rounded-xl flex items-center justify-center">
                          <Download className="w-6 h-6 text-gray-400 rotate-180" />
                        </div>
                        <div>
                          <p className="text-base font-medium text-gray-700">点击上传文件</p>
                          <p className="text-xs text-gray-400 mt-1">支持 CSV、Excel (.xlsx, .xls) 格式</p>
                        </div>
                      </div>
                    </label>
                  </div>
                )}
              </div>

              <div className="p-6 bg-gray-50 flex justify-end gap-3">
                <button 
                  onClick={() => setIsAddGuestModalOpen(false)}
                  className="px-6 py-2 border border-gray-200 rounded-lg text-sm font-medium hover:bg-white transition-colors"
                >
                  取消
                </button>
                <button 
                  onClick={() => {
                    const el = document.getElementById('bulk-guest-input') as HTMLTextAreaElement;
                    const lines = el.value.split('\n').filter(l => l.trim());
                    const newGuests: Guest[] = lines.map((line, index) => {
                      // Handle parentheses format: Name(Tag) or Name(maybe)
                      let name = line;
                      let tag = '';
                      let status = newGuestStatus;

                      const parenMatch = line.match(/(.+)\((.+)\)/);
                      if (parenMatch) {
                        name = parenMatch[1].trim();
                        const content = parenMatch[2].trim();
                        if (content === '未必' || content === 'maybe') {
                          status = 'maybe';
                        } else if (content === '必来' || content === 'confirmed') {
                          status = 'confirmed';
                        } else {
                          tag = content;
                        }
                      } else {
                        const parts = line.split(':');
                        name = parts[0]?.trim() || '未命名';
                        tag = parts[1]?.trim() || '';
                        status = (parts[2]?.trim() as any) || newGuestStatus;
                      }

                      return {
                        id: `g${Date.now()}-${index}`,
                        name,
                        tags: tag ? [tag] : [],
                        status,
                      };
                    });
                    setGuests([...guests, ...newGuests]);
                    setIsAddGuestModalOpen(false);
                  }}
                  className="px-6 py-2 bg-gray-800 text-white rounded-lg text-sm font-medium hover:bg-gray-700 transition-colors"
                >
                  导入
                </button>
              </div>
            </motion.div>
          </div>
        )}

        {isAddTableModalOpen && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-xl shadow-2xl w-full max-w-lg overflow-hidden"
            >
              <div className="p-6 border-b border-gray-100 flex items-center justify-between">
                <div>
                  <h3 className="text-xl font-bold">批量添加桌子</h3>
                  <p className="text-sm text-gray-500 mt-1">设置桌子数量、每桌座位数和桌子类型</p>
                </div>
                <button onClick={() => setIsAddTableModalOpen(false)} className="p-2 hover:bg-gray-100 rounded-full">
                  <X className="w-5 h-5 text-gray-400" />
                </button>
              </div>
              
              <div className="p-8 space-y-8">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">桌数</label>
                  <input 
                    type="number" 
                    value={newTableCount}
                    onChange={(e) => setNewTableCount(parseInt(e.target.value) || 1)}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-200"
                  />
                </div>

                <div className="text-center">
                  <label className="block text-sm font-bold text-gray-700 mb-4">人数（每桌）</label>
                  <div className="text-6xl font-bold text-gray-800 mb-4">{newTableSeats} 人</div>
                  <input 
                    type="range" 
                    min="6" 
                    max="60" 
                    value={newTableSeats}
                    onChange={(e) => setNewTableSeats(parseInt(e.target.value))}
                    className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-gray-800" 
                  />
                  <div className="flex justify-between text-xs text-gray-400 mt-2">
                    <span>6人</span>
                    <span>60人</span>
                  </div>
                </div>

                <div className="flex justify-center py-8">
                  <div className="w-48 h-48 rounded-full border-2 border-gray-200 flex items-center justify-center relative">
                    <span className="text-sm font-medium text-gray-400">圆桌</span>
                    {Array.from({ length: Math.min(newTableSeats, 20) }).map((_, i) => (
                      <div 
                        key={i}
                        className="absolute w-3 h-3 bg-gray-600 rounded-full"
                        style={{
                          transform: `rotate(${(i * 360) / Math.min(newTableSeats, 20)}deg) translateY(-80px)`
                        }}
                      />
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-4">桌子类型</label>
                  <div className="space-y-3">
                    <label className="flex items-center gap-3 cursor-pointer group">
                      <div className="w-5 h-5 rounded-full border-2 border-gray-800 flex items-center justify-center">
                        <div className="w-2.5 h-2.5 bg-gray-800 rounded-full" />
                      </div>
                      <span className="text-sm font-medium">圆桌</span>
                    </label>
                    <label className="flex items-center gap-3 cursor-pointer group">
                      <div className="w-5 h-5 rounded-full border-2 border-gray-200 flex items-center justify-center group-hover:border-gray-300">
                      </div>
                      <span className="text-sm font-medium text-gray-400">长桌</span>
                    </label>
                  </div>
                </div>
              </div>

              <div className="p-6 bg-gray-50 flex justify-end gap-3">
                <button 
                  onClick={() => setIsAddTableModalOpen(false)}
                  className="px-6 py-2 border border-gray-200 rounded-lg text-sm font-medium hover:bg-white transition-colors"
                >
                  取消
                </button>
                <button 
                  onClick={() => {
                    for (let i = 0; i < newTableCount; i++) {
                      addTable({ 
                        name: `桌号${tables.length + i + 1}`, 
                        type: 'round', 
                        seatsCount: newTableSeats 
                      });
                    }
                  }}
                  className="px-6 py-2 bg-gray-800 text-white rounded-lg text-sm font-medium hover:bg-gray-700 transition-colors"
                >
                  添加 {newTableCount} 张桌子
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
