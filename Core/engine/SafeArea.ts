export interface SafeAreaInsets {
    top: number;
    bottom: number;
    left: number;
    right: number;
}

export interface SafeAreaRect {
    x: number;
    y: number;
    width: number;
    height: number;
}

export interface SafeAreaFrame {
    width: number;
    height: number;
    offsetX: number;
    offsetY: number;
}

export function calculateSafeAreaFrame(
    screenWidth: number,
    screenHeight: number,
    insets: SafeAreaInsets,
): SafeAreaFrame {
    return {
        width: screenWidth - insets.left - insets.right,
        height: screenHeight - insets.top - insets.bottom,
        offsetX: (insets.left - insets.right) / 2,
        offsetY: (insets.bottom - insets.top) / 2,
    };
}

export function calculateSafeAreaInsets(
    screenWidth: number,
    screenHeight: number,
    safeArea: SafeAreaRect,
): SafeAreaInsets {
    return {
        left: safeArea.x,
        bottom: safeArea.y,
        right: screenWidth - safeArea.x - safeArea.width,
        top: screenHeight - safeArea.y - safeArea.height,
    };
}
