import { useState } from "react";
import { ProfilePosts } from "./DiscoverDates";
import "./ProfileHome.css";

export default function ProfileHome({profile,onEdit,onSettings,onConnections,onCommunity}) {
  const [tab,setTab]=useState("posts");
  return <section className="oph screen-panel">
    <div className="oph-banner"><span>YOUR LITTLE CORNER OF ONAHEYA ♡</span></div>
    <div className="oph-main">
      <div className="oph-heading">
        <div className="oph-avatar">{profile.avatarUrl ? <img src={profile.avatarUrl} alt={`${profile.displayName}'s profile photo`} /> : <span>{profile.displayName?.[0]?.toUpperCase()||"♡"}</span>}</div>
        <div className="oph-identity"><h2>{profile.displayName}</h2><p>@{profile.username}</p><p className="oph-bio">{profile.bio||"Add a little about yourself and the stories you love."}</p></div>
        <button className="oph-settings" onClick={onSettings} aria-label="Open account settings" title="Settings">⚙ Settings</button>
      </div>
      <div className="oph-stats">
        <button onClick={()=>setTab("posts")}><strong>My posts</strong><span>Reviews & recommendations</span></button>
        <button onClick={onConnections}><strong>{profile.followersCount||0}</strong><span>Followers</span></button>
        <button onClick={onConnections}><strong>{profile.followingCount||0}</strong><span>Following</span></button>
      </div>
      <div className="oph-actions"><button className="oph-edit" onClick={onEdit}>✎ Edit profile</button><button onClick={onCommunity}>♡ Community</button></div>
      <div className="oph-tabs" role="tablist"><button role="tab" aria-selected={tab==="posts"} className={tab==="posts"?"active":""} onClick={()=>setTab("posts")}>▦ Posts</button><button role="tab" aria-selected={tab==="about"} className={tab==="about"?"active":""} onClick={()=>setTab("about")}>♡ About</button></div>
      {tab==="posts" ? <ProfilePosts profile={profile}/> : <div className="oph-about"><h3>About {profile.displayName}</h3><p>{profile.bio||"No bio yet."}</p><p>Favourite genres: {(profile.favoriteGenres||[]).join(", ")||"Not added"}</p><button onClick={onEdit}>Edit your details →</button></div>}
    </div>
  </section>;
}
