"use client";

import { ChevronDown } from "lucide-react";
import { type RefObject, useCallback, useEffect, useRef } from "react";

import { SavedSearchesList } from "@/features/saved-searches";
import { SearchForm } from "@/features/search-form";
import { SearchGuide } from "@/features/search-guide";
import { SearchHistory } from "@/features/search-history";

const HEADER_HEIGHT_REM = 3.5;
const FORM_TOP_PADDING_PX = 6;
const HIDDEN_TOP = "-4rem";
const SLIDE_DURATION = "top 500ms ease-out";

/** Jump the bar above viewport, force reflow, then slide it down to minTop. */
const slideBarIn = (el: HTMLElement, minTop: number) => {
  el.style.transition = "none";
  el.style.top = HIDDEN_TOP;
  el.classList.add("shadow-sm");
  void el.offsetHeight;
  el.style.transition = SLIDE_DURATION;
  el.style.top = `${minTop}px`;
};

/** Snap the bar to the given top instantly (no transition). */
const snapBarTo = (el: HTMLElement, top: string) => {
  el.style.transition = "none";
  el.style.top = top;
  el.classList.remove("shadow-sm");
};

interface ScrollTrackingRefs {
  scroll: RefObject<HTMLDivElement | null>;
  placeholder: RefObject<HTMLDivElement | null>;
  formWrapper: RefObject<HTMLDivElement | null>;
}

const computeMinTop = () => {
  const remInPx = Number.parseFloat(getComputedStyle(document.documentElement).fontSize);
  return HEADER_HEIGHT_REM * remInPx + FORM_TOP_PADDING_PX;
};

/**
 * Single fixed SearchForm that:
 * - Page 1: tracks placeholder position (centered, no transition)
 * - Page 2: jumps above viewport, then slides DOWN from top (500ms ease-out)
 * - Back to page 1: snaps back to placeholder instantly
 */
const useScrollTrackingForm = (refs: ScrollTrackingRefs) => {
  useEffect(() => {
    const { scroll, placeholder, formWrapper } = {
      scroll: refs.scroll.current,
      placeholder: refs.placeholder.current,
      formWrapper: refs.formWrapper.current,
    };
    if (!scroll || !placeholder || !formWrapper) {
      return;
    }

    let wasAtTop = false;

    const updatePosition = () => {
      const rect = placeholder.getBoundingClientRect();
      const minTop = computeMinTop();

      if (rect.top <= minTop) {
        if (!wasAtTop) {
          slideBarIn(formWrapper, minTop);
          wasAtTop = true;
        }
      } else {
        snapBarTo(formWrapper, `${rect.top}px`);
        wasAtTop = false;
      }
    };

    updatePosition();
    scroll.addEventListener("scroll", updatePosition, { passive: true });
    window.addEventListener("resize", updatePosition);
    return () => {
      scroll.removeEventListener("scroll", updatePosition);
      window.removeEventListener("resize", updatePosition);
    };
  }, [refs]);
};

const PageOneContent = ({
  placeholderRef,
  onScrollToGuide,
}: {
  placeholderRef: RefObject<HTMLDivElement | null>;
  onScrollToGuide: () => void;
}) => (
  <div className="flex h-full snap-start flex-col items-center pb-[var(--header-height)]">
    <div className="flex-1" />
    {/* Invisible placeholder — the fixed form visually sits here */}
    <div ref={placeholderRef} className="w-full max-w-2xl px-3 py-2 sm:px-4">
      <div className="h-12" />
    </div>
    <div className="flex w-full max-w-2xl flex-col gap-3 px-3 pt-6 sm:gap-4 sm:px-4 sm:pt-8">
      <SavedSearchesList />
      <SearchHistory />
    </div>
    <div className="flex flex-1 flex-col items-center justify-end pb-6">
      <button
        type="button"
        onClick={onScrollToGuide}
        className="flex animate-bounce cursor-pointer flex-col items-center bg-transparent text-foreground/50 transition-colors hover:text-foreground/80"
      >
        <span>使い方</span>
        <ChevronDown className="size-6" />
      </button>
    </div>
  </div>
);

const PageTwoContent = ({ guideRef }: { guideRef: RefObject<HTMLDivElement | null> }) => (
  <div ref={guideRef} className="min-h-full snap-start">
    <div className="h-16" />
    <div className="mx-auto w-full max-w-2xl px-3 pt-4 pb-16 sm:px-4">
      <SearchGuide />
    </div>
  </div>
);

export const HomePage = () => {
  const guideRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const placeholderRef = useRef<HTMLDivElement>(null);
  const formWrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: 0 });
  }, []);
  useScrollTrackingForm({
    scroll: scrollRef,
    placeholder: placeholderRef,
    formWrapper: formWrapperRef,
  });

  const scrollToGuide = useCallback(() => {
    guideRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  return (
    <div ref={scrollRef} className="relative h-full snap-y snap-mandatory overflow-y-auto">
      {/* Single fixed SearchForm — center on page 1, slide from top on page 2 */}
      <div
        ref={formWrapperRef}
        className="fixed left-1/2 z-sticky w-full max-w-2xl -translate-x-1/2 bg-background px-3 py-2 sm:px-4 sm:py-3"
      >
        <SearchForm />
      </div>
      <PageOneContent placeholderRef={placeholderRef} onScrollToGuide={scrollToGuide} />
      <PageTwoContent guideRef={guideRef} />
    </div>
  );
};
