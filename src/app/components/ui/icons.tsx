import { Loader2, Info, type Icon as LucideIcon, User2Icon, RefreshCcwIcon } from "lucide-react";
import { FaGoogle } from "react-icons/fa";
import { BsFillImageFill } from "react-icons/bs";

export type Icon = typeof LucideIcon;

export const Icons = {
  spinner: Loader2,
  google: FaGoogle,
  placeholder: BsFillImageFill,
  info: Info,
  user: User2Icon,
  refresh: RefreshCcwIcon,
};