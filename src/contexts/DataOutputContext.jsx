import React, { createContext, useContext, useReducer, useMemo, useEffect } from 'react';

// Initial state structure
const initialState = {
    // Data state
    data: {
        headers: [],
        table: [],
        totalRows: 0,
        displayedRows: 0,
        columns: 0
    },

    // Pagination state
    pagination: {
        currentPage: 1,
        pageSize: 200,
        customPageSize: '200',
        showCustomInput: false
    },

    // Filtering state
    filters: {
        columnFilters: {},
        visibleColumns: new Set(),
        columnSearch: '',
        showColumnSelector: false,
        columnOrder: [] // Custom column order for reordering
    },

    // UI state
    ui: {
        showColumnFilter: false,
        selectedColumn: '',
        columnFilterSearch: '',
        selectedValues: new Set(),
        availableValues: [],
        filteredValues: [],
        dropdownPosition: { top: 0, left: 0 },
        dropdownHeight: {
            maxHeight: 400,
            valuesMaxHeight: 300
        },
        showActiveFiltersDropdown: false,
        isLoading: false,
        dataProcessed: false
    },

    // Grid state
    grid: {
        tableHeight: 800,
        hasManualResizes: false,
        manuallyResizedColumns: new Set()
    }
};

// Action types
const ACTIONS = {
    // Data actions
    SET_DATA: 'SET_DATA',
    SET_LOADING: 'SET_LOADING',
    SET_DATA_PROCESSED: 'SET_DATA_PROCESSED',

    // Pagination actions
    SET_CURRENT_PAGE: 'SET_CURRENT_PAGE',
    SET_PAGE_SIZE: 'SET_PAGE_SIZE',
    SET_CUSTOM_PAGE_SIZE: 'SET_CUSTOM_PAGE_SIZE',
    TOGGLE_CUSTOM_INPUT: 'TOGGLE_CUSTOM_INPUT',

    // Filter actions
    SET_COLUMN_FILTERS: 'SET_COLUMN_FILTERS',
    ADD_COLUMN_FILTER: 'ADD_COLUMN_FILTER',
    REMOVE_COLUMN_FILTER: 'REMOVE_COLUMN_FILTER',
    CLEAR_ALL_FILTERS: 'CLEAR_ALL_FILTERS',
    SET_VISIBLE_COLUMNS: 'SET_VISIBLE_COLUMNS',
    TOGGLE_COLUMN_VISIBILITY: 'TOGGLE_COLUMN_VISIBILITY',
    SET_COLUMN_SEARCH: 'SET_COLUMN_SEARCH',
    TOGGLE_COLUMN_SELECTOR: 'TOGGLE_COLUMN_SELECTOR',
    SET_COLUMN_ORDER: 'SET_COLUMN_ORDER',
    RESET_COLUMN_ORDER: 'RESET_COLUMN_ORDER',

    // UI actions
    SET_COLUMN_FILTER_UI: 'SET_COLUMN_FILTER_UI',
    SET_FILTER_VALUES: 'SET_FILTER_VALUES',
    SET_DROPDOWN_POSITION: 'SET_DROPDOWN_POSITION',
    TOGGLE_ACTIVE_FILTERS_DROPDOWN: 'TOGGLE_ACTIVE_FILTERS_DROPDOWN',

    // Grid actions
    SET_TABLE_HEIGHT: 'SET_TABLE_HEIGHT',
    SET_MANUAL_RESIZES: 'SET_MANUAL_RESIZES',
    ADD_MANUAL_RESIZE: 'ADD_MANUAL_RESIZE'
};

// Reducer function
const dataOutputReducer = (state, action) => {
    switch (action.type) {
        case ACTIONS.SET_DATA:
            return {
                ...state,
                data: { ...state.data, ...action.payload }
            };

        case ACTIONS.SET_LOADING:
            return {
                ...state,
                ui: { ...state.ui, isLoading: action.payload }
            };

        case ACTIONS.SET_DATA_PROCESSED:
            return {
                ...state,
                ui: { ...state.ui, dataProcessed: action.payload }
            };

        case ACTIONS.SET_CURRENT_PAGE:
            return {
                ...state,
                pagination: { ...state.pagination, currentPage: action.payload }
            };

        case ACTIONS.SET_PAGE_SIZE:
            return {
                ...state,
                pagination: {
                    ...state.pagination,
                    pageSize: action.payload,
                    currentPage: 1 // Reset to first page when page size changes
                }
            };

        case ACTIONS.SET_CUSTOM_PAGE_SIZE:
            return {
                ...state,
                pagination: { ...state.pagination, customPageSize: action.payload }
            };

        case ACTIONS.TOGGLE_CUSTOM_INPUT:
            return {
                ...state,
                pagination: { ...state.pagination, showCustomInput: action.payload }
            };

        case ACTIONS.SET_COLUMN_FILTERS:
            return {
                ...state,
                filters: { ...state.filters, columnFilters: action.payload }
            };

        case ACTIONS.ADD_COLUMN_FILTER:
            return {
                ...state,
                filters: {
                    ...state.filters,
                    columnFilters: {
                        ...state.filters.columnFilters,
                        [action.payload.column]: action.payload.values
                    }
                }
            };

        case ACTIONS.REMOVE_COLUMN_FILTER:
            const newFilters = { ...state.filters.columnFilters };
            delete newFilters[action.payload];
            return {
                ...state,
                filters: { ...state.filters, columnFilters: newFilters }
            };

        case ACTIONS.CLEAR_ALL_FILTERS:
            return {
                ...state,
                filters: { ...state.filters, columnFilters: {} }
            };

        case ACTIONS.SET_VISIBLE_COLUMNS:
            return {
                ...state,
                filters: { ...state.filters, visibleColumns: action.payload }
            };

        case ACTIONS.TOGGLE_COLUMN_VISIBILITY:
            const newVisibleColumns = new Set(state.filters.visibleColumns);
            if (newVisibleColumns.has(action.payload)) {
                newVisibleColumns.delete(action.payload);
            } else {
                newVisibleColumns.add(action.payload);
            }
            return {
                ...state,
                filters: { ...state.filters, visibleColumns: newVisibleColumns }
            };

        case ACTIONS.SET_COLUMN_SEARCH:
            return {
                ...state,
                filters: { ...state.filters, columnSearch: action.payload }
            };

        case ACTIONS.TOGGLE_COLUMN_SELECTOR:
            return {
                ...state,
                filters: { ...state.filters, showColumnSelector: action.payload }
            };

        case ACTIONS.SET_COLUMN_ORDER:
            return {
                ...state,
                filters: { ...state.filters, columnOrder: action.payload }
            };

        case ACTIONS.RESET_COLUMN_ORDER:
            return {
                ...state,
                filters: { ...state.filters, columnOrder: [] }
            };

        case ACTIONS.SET_COLUMN_FILTER_UI:
            return {
                ...state,
                ui: { ...state.ui, ...action.payload }
            };

        case ACTIONS.SET_FILTER_VALUES:
            return {
                ...state,
                ui: { ...state.ui, ...action.payload }
            };

        case ACTIONS.SET_DROPDOWN_POSITION:
            return {
                ...state,
                ui: { ...state.ui, dropdownPosition: action.payload }
            };

        case ACTIONS.TOGGLE_ACTIVE_FILTERS_DROPDOWN:
            return {
                ...state,
                ui: { ...state.ui, showActiveFiltersDropdown: action.payload }
            };

        case ACTIONS.SET_TABLE_HEIGHT:
            return {
                ...state,
                grid: { ...state.grid, tableHeight: action.payload }
            };

        case ACTIONS.SET_MANUAL_RESIZES:
            return {
                ...state,
                grid: { ...state.grid, hasManualResizes: action.payload }
            };

        case ACTIONS.ADD_MANUAL_RESIZE:
            const newResizedColumns = new Set(state.grid.manuallyResizedColumns);
            newResizedColumns.add(action.payload);
            return {
                ...state,
                grid: {
                    ...state.grid,
                    manuallyResizedColumns: newResizedColumns,
                    hasManualResizes: true
                }
            };

        default:
            return state;
    }
};

// Create context
const DataOutputContext = createContext();

// Provider component
export const DataOutputProvider = ({ children, initialData, nodeOutput }) => {
    const [state, dispatch] = useReducer(dataOutputReducer, {
        ...initialState,
        data: initialData || initialState.data
    });

    // Update data when initialData changes
    useEffect(() => {
        if (initialData && initialData !== state.data) {
            console.log('🔄 DataOutputProvider: Updating data from initialData:', {
                nodeId: nodeOutput?.step_type,
                headersCount: initialData.headers?.length,
                tableRows: initialData.table?.length
            });
            dispatch({
                type: 'SET_DATA',
                payload: initialData
            });
        }
    }, [initialData, nodeOutput?.step_type, state.data]);

    // Memoized computed values
    const computedValues = useMemo(() => {
        const { data, pagination, filters } = state;



        // Calculate filtered data
        let filteredData = data.table;
        Object.entries(filters.columnFilters).forEach(([field, values]) => {
            if (values.size > 0) {
                filteredData = filteredData.filter(row => {
                    const cellValue = row[field]?.toString() || '';
                    return values.has(cellValue) || (values.has('(Blanks)') && (!cellValue || cellValue.trim() === ''));
                });
            }
        });

        // Calculate pagination
        const totalRows = filteredData.length;
        const totalPages = Math.ceil(totalRows / pagination.pageSize);
        const startIndex = (pagination.currentPage - 1) * pagination.pageSize;
        const endIndex = Math.min(startIndex + pagination.pageSize, totalRows);
        const displayedRows = filteredData.slice(startIndex, endIndex);
        const displayedRowsCount = displayedRows.length;

        // Calculate visible columns
        const baseVisibleColumns = data.headers.filter(col =>
            filters.visibleColumns.has(col) || filters.visibleColumns.size === 0
        );

        // Apply custom column order if available
        let visibleColumnsList;
        if (filters.columnOrder.length > 0) {
            // Use custom order but only include visible columns
            visibleColumnsList = filters.columnOrder.filter(col => baseVisibleColumns.includes(col));
            // Add any visible columns that aren't in the custom order
            baseVisibleColumns.forEach(col => {
                if (!visibleColumnsList.includes(col)) {
                    visibleColumnsList.push(col);
                }
            });
        } else {
            visibleColumnsList = baseVisibleColumns;
        }

        const result = {
            filteredData,
            totalRows,
            totalPages,
            startIndex,
            endIndex,
            displayedRows,
            displayedRowsCount,
            visibleColumnsList
        };



        return result;
    }, [state]);

    // Action creators
    const actions = useMemo(() => ({
        // Data actions
        setData: (data) => dispatch({ type: ACTIONS.SET_DATA, payload: data }),
        setLoading: (loading) => dispatch({ type: ACTIONS.SET_LOADING, payload: loading }),
        setDataProcessed: (processed) => dispatch({ type: ACTIONS.SET_DATA_PROCESSED, payload: processed }),

        // Pagination actions
        setCurrentPage: (page) => dispatch({ type: ACTIONS.SET_CURRENT_PAGE, payload: page }),
        setPageSize: (size) => dispatch({ type: ACTIONS.SET_PAGE_SIZE, payload: size }),
        setCustomPageSize: (size) => dispatch({ type: ACTIONS.SET_CUSTOM_PAGE_SIZE, payload: size }),
        toggleCustomInput: (show) => dispatch({ type: ACTIONS.TOGGLE_CUSTOM_INPUT, payload: show }),

        // Filter actions
        setColumnFilters: (filters) => dispatch({ type: ACTIONS.SET_COLUMN_FILTERS, payload: filters }),
        addColumnFilter: (column, values) => dispatch({ type: ACTIONS.ADD_COLUMN_FILTER, payload: { column, values } }),
        removeColumnFilter: (column) => dispatch({ type: ACTIONS.REMOVE_COLUMN_FILTER, payload: column }),
        clearAllFilters: () => dispatch({ type: ACTIONS.CLEAR_ALL_FILTERS }),
        setVisibleColumns: (columns) => dispatch({ type: ACTIONS.SET_VISIBLE_COLUMNS, payload: columns }),
        toggleColumnVisibility: (column) => dispatch({ type: ACTIONS.TOGGLE_COLUMN_VISIBILITY, payload: column }),
        setColumnSearch: (search) => dispatch({ type: ACTIONS.SET_COLUMN_SEARCH, payload: search }),
        toggleColumnSelector: (show) => dispatch({ type: ACTIONS.TOGGLE_COLUMN_SELECTOR, payload: show }),
        setColumnOrder: (order) => dispatch({ type: ACTIONS.SET_COLUMN_ORDER, payload: order }),
        resetColumnOrder: () => dispatch({ type: ACTIONS.RESET_COLUMN_ORDER }),

        // UI actions
        setColumnFilterUI: (uiState) => dispatch({ type: ACTIONS.SET_COLUMN_FILTER_UI, payload: uiState }),
        setFilterValues: (values) => dispatch({ type: ACTIONS.SET_FILTER_VALUES, payload: values }),
        setDropdownPosition: (position) => dispatch({ type: ACTIONS.SET_DROPDOWN_POSITION, payload: position }),
        toggleActiveFiltersDropdown: (show) => dispatch({ type: ACTIONS.TOGGLE_ACTIVE_FILTERS_DROPDOWN, payload: show }),

        // Grid actions
        setTableHeight: (height) => dispatch({ type: ACTIONS.SET_TABLE_HEIGHT, payload: height }),
        setManualResizes: (hasResizes) => dispatch({ type: ACTIONS.SET_MANUAL_RESIZES, payload: hasResizes }),
        addManualResize: (columnId) => dispatch({ type: ACTIONS.ADD_MANUAL_RESIZE, payload: columnId })
    }), []);

    const contextValue = useMemo(() => ({
        state,
        actions,
        computed: computedValues,
        nodeOutput
    }), [state, actions, computedValues, nodeOutput]);

    return (
        <DataOutputContext.Provider value={contextValue}>
            {children}
        </DataOutputContext.Provider>
    );
};

// Custom hook to use the context
export const useDataOutput = () => {
    const context = useContext(DataOutputContext);
    if (!context) {
        throw new Error('useDataOutput must be used within a DataOutputProvider');
    }
    return context;
};

export default DataOutputContext;
