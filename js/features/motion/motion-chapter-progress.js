function clamp(value) {
    return Math.max(0, Math.min(1, Number(value) || 0));
}

export function getMotionChapterRange(motion, chapters) {
    const start = chapters.findIndex(chapter => chapter.id === motion?.timeline?.startChapterId);
    const end = chapters.findIndex(chapter => chapter.id === motion?.timeline?.endChapterId);
    if (start < 0 || end < 0) return null;
    return { startIndex: Math.min(start, end), endIndex: Math.max(start, end) };
}

export function getMotionProgress(motion, chapters, chapterId, chapterProgress = 0) {
    const range = getMotionChapterRange(motion, chapters);
    const activeIndex = chapters.findIndex(chapter => chapter.id === chapterId);
    if (!range || activeIndex < 0) return null;
    if (activeIndex < range.startIndex) return 0;
    if (activeIndex > range.endIndex) return 1;
    const chapterCount = range.endIndex - range.startIndex + 1;
    const progress = ((activeIndex - range.startIndex) + clamp(chapterProgress)) / chapterCount;
    return motion?.motion?.direction === "reverse" ? 1 - progress : progress;
}
