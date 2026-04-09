import { ProfileTab } from "./ProfileTab";
import { SettingsTab } from "./SettingsTab";

export function ProfileandSettingsTab() {
  return (
    <div className="w-full">
      <ProfileTab />
      <div className="mt-0" />
      <SettingsTab />
    </div>
  );
}
