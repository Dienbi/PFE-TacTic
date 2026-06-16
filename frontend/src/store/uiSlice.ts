import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface UiState {
    sidebarCollapsed: boolean;
}

const initialState: UiState = {
    sidebarCollapsed: false,
};

const uiSlice = createSlice({
    name: 'ui',
    initialState,
    reducers: {
        setSidebarCollapsed(state, action: PayloadAction<boolean>) {
            state.sidebarCollapsed = action.payload;
        },
        toggleSidebar(state) {
            state.sidebarCollapsed = !state.sidebarCollapsed;
        },
    },
});

export const { setSidebarCollapsed, toggleSidebar } = uiSlice.actions;
export default uiSlice.reducer;
