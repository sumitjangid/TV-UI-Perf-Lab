import { useEffect } from "react";
import { useDispatch } from "react-redux";
import type { AppDispatch } from "../store";
import { moveDown, moveLeft, moveRight, moveUp } from "../store/focusSlice";

export function useRemoteKeys(onSelect: () => void, onBack: () => void): void {
  const dispatch = useDispatch<AppDispatch>();

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent): void {
      switch (event.key) {
        case "ArrowDown":
          dispatch(moveDown());
          break;
        case "ArrowLeft":
          dispatch(moveLeft());
          break;
        case "ArrowRight":
          dispatch(moveRight());
          break;
        case "ArrowUp":
          dispatch(moveUp());
          break;
        case "Enter":
          onSelect();
          break;
        case "Backspace":
        case "Escape":
          onBack();
          break;
        default:
          return;
      }

      event.preventDefault();
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [dispatch, onBack, onSelect]);
}
