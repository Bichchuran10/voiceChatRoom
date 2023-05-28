const appid = "6d20097619b64660aae9eb3256874ea8";
import AgoraRTC from "agora-rtc-sdk-ng";
import AgoraRTM from "agora-rtm-sdk";
const token = null;
const rtcUid = Math.floor(Math.random() * 2032);
const rtmUid = String(Math.floor(Math.random() * 2032));

let roomId = "main";

let audioTracks = {
  localAudioTrack: null,
  remoteAudioTracks: {},
};

let micMuted = true;

let rtcClient;
let rtmClient;
let channel;

const initRtm = async (name) => {
  rtmClient = AgoraRTM.createInstance(appid);
  await rtmClient.login({ uid: rtmUid, token: token });
  channel = rtmClient.createChannel(roomId);
  await channel.join();
  getChannelMembers();
  channel.on("MemberJoined", handleMemberJoined);
  channel.on("MemberLeft", handleMemberLeft);
  window.addEventListener("beforeunload", leaveRTMChannel);
};

const initRtc = async () => {
  rtcClient = AgoraRTC.createClient({ mode: "rtc", codec: "vp8" });

  //   rtcClient.on("user-joined", handleUserJoined);
  rtcClient.on("user-published", handleUserPublished);
  rtcClient.on("user-left", handleUserLeft);

  await rtcClient.join(appid, roomId, token, rtcUid);
  audioTracks.localAudioTrack = await AgoraRTC.createMicrophoneAudioTrack();
  audioTracks.localAudioTrack.setMuted(micMuted);
  await rtcClient.publish(audioTracks.localAudioTrack);

  //   document
  //     .getElementById("members")
  //     .insertAdjacentHTML(
  //       "beforeend",
  //       `<div class="speaker user-rtc-${rtcUid}" id="${rtcUid}"><p>${rtcUid}</p></div>`
  //     );

  //   initVolumeIndicator();
};

let initVolumeIndicator = async () => {
  //1
  AgoraRTC.setParameter("AUDIO_VOLUME_INDICATION_INTERVAL", 200);
  rtcClient.enableAudioVolumeIndicator();

  //2
  rtcClient.on("volume-indicator", (volumes) => {
    volumes.forEach((volume) => {
      console.log(`UID ${volume.uid} Level ${volume.level}`);

      //3
      try {
        let item = document.getElementsByClassName(`user-rtc-${volume.uid}`)[0];

        if (volume.level >= 50) {
          item.style.borderColor = "#00ff00";
        } else {
          item.style.borderColor = "#fff";
        }
      } catch (error) {
        console.error(error);
      }
    });
  });
};

// let handleUserJoined = async (user) => {
//   console.log("USER:", user);
//   document
//     .getElementById("members")
//     .insertAdjacentHTML(
//       "beforeend",
//       `<div class="speaker user-rtc-${user.uid}" id="${user.uid}"><p>${user.uid}</p></div>`
//     );
// };

let handleUserPublished = async (user, mediaType) => {
  await rtcClient.subscribe(user, mediaType);

  if (mediaType == "audio") {
    audioTracks.remoteAudioTracks[user.uid] = [user.audioTrack];
    user.audioTrack.play();
  }
};

let handleUserLeft = async (user) => {
  delete audioTracks.remoteAudioTracks[user.uid];
  //   document.getElementById(user.uid).remove();
};

let handleMemberJoined = async (MemberId) => {
  document
    .getElementById("members")
    .insertAdjacentHTML(
      "beforeend",
      `<div class="speaker user-rtc-${"---"}" id="${MemberId}"><p>${MemberId}</p></div>`
    );
};

let handleMemberLeft = async (MemberId) => {
  document.getElementById(MemberId).remove();
};

let getChannelMembers = async () => {
  //1
  let members = await channel.getMembers();

  //2
  for (let i = 0; members.length > i; i++) {
    let newMember = `
      <div class="speaker user-rtc-${"-----"}" id="${members[i]}">
          <p>${members[i]}</p>
      </div>`;

    document
      .getElementById("members")
      .insertAdjacentHTML("beforeend", newMember);
  }
};

const toggleMic = async (e) => {
  if (micMuted) {
    e.target.src = "icons/mic.svg";
    e.target.style.backgroundColor = "ivory";
    micMuted = false;
  } else {
    e.target.src = "icons/mic-off.svg";
    e.target.style.backgroundColor = "indianred";

    micMuted = true;
  }
  audioTracks.localAudioTrack.setMuted(micMuted);
};

let lobbyForm = document.getElementById("form");

const enterRoom = async (e) => {
  e.preventDefault();

  let displayName = "";
  initRtc();
  initRtm();

  lobbyForm.style.display = "none";
  document.getElementById("room-header").style.display = "flex";
};
let leaveRTMChannel = async () => {
  await channel.leave();
  await rtmClient.logout();
};
let leaveRoom = async () => {
  audioTracks.localAudioTrack.stop();
  audioTracks.localAudioTrack.close();
  rtcClient.unpublish();
  rtcClient.leave();

  leaveRTMChannel();

  document.getElementById("form").style.display = "block";
  document.getElementById("room-header").style.display = "none";
  document.getElementById("members").innerHTML = "";
};

lobbyForm.addEventListener("submit", enterRoom);
document.getElementById("leave-icon").addEventListener("click", leaveRoom);
document.getElementById("mic-icon").addEventListener("click", toggleMic);
