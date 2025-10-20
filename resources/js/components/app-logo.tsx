import { GalleryVerticalEnd } from 'lucide-react';
// import AppLogoIcon from './app-logo-icon';

export default function AppLogo() {
    return (
        <>
          <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground  dark:bg-white dark:text-black">
                <GalleryVerticalEnd className="size-4  dark:bg-white dark:text-black" />
              </div>
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-semibold">
                  Console
                </span>
                <span className="text-[10px] opacity-60 leading-tight">v0.2</span>
              </div>
        </>
    );
}
