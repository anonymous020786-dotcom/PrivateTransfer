// Generates 140+ SEO-ready markdown blog posts into content/blog/.
// Content is composed from per-category knowledge banks plus specific titles,
// with seeded section rotation so every article is distinct and on-topic.
// Run: node scripts/generate-blog.mjs

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const OUT = path.join(__dirname, '..', 'content', 'blog')

const AUTHOR = 'Naushad Alam'
const BRAND = 'Zync'

// ── Category knowledge banks: reusable, real, informative sections ──────────
const BANK = {
  'Privacy & Security': [
    ['Why end-to-end encryption matters', 'End-to-end encryption ensures that only the sender and the intended recipient can read the data. Intermediaries — including the service provider — only ever see ciphertext. For file transfers this means a leaked server or a compromised network link cannot expose your content, because the keys never leave the endpoints.'],
    ['The problem with "upload then share"', 'Most sharing tools upload your file to a server, store it, and hand out a link. That model creates a permanent copy outside your control, subject to breaches, retention policies, and legal requests. Peer-to-peer transfer removes the stored copy entirely — there is simply nothing on a server to leak.'],
    ['Threat modeling your transfers', 'Before choosing a tool, ask who you are protecting against: a curious network admin, a breached cloud provider, or a targeted attacker. Different threats call for different controls — TLS in transit, encryption at rest, password protection, and minimizing how long data exists anywhere.'],
    ['Passwords add a second lock', 'Even on an encrypted channel, a password gate ensures that only someone who knows the secret can begin a download. Share the link and the password over separate channels so intercepting one is not enough.'],
    ['Metadata is data too', 'Filenames, sizes, and timestamps can reveal a lot. Privacy-respecting tools minimize the metadata they retain and avoid building profiles tied to your identity.'],
    ['Zero-knowledge by design', 'A zero-knowledge architecture means the service cannot read your content even if compelled to. Designing for zero knowledge — rather than promising not to look — is the stronger guarantee.'],
  ],
  'File Sharing': [
    ['Choosing the right sharing method', 'The best method depends on file size, recipient, and sensitivity. Email attachments cap out quickly, cloud links persist indefinitely, and peer-to-peer transfers are ideal for one-off, private sends where you do not want a lingering copy.'],
    ['Handling large files gracefully', 'Large files strain email and many web uploaders. Direct browser-to-browser transfer sidesteps upload limits because the bytes flow straight to the recipient at the speed of your connection rather than through a storage tier.'],
    ['Links that expire vs. links that linger', 'A shared cloud link often lives until you remember to delete it. Ephemeral transfers flip the default: the share exists only while you keep the tab open, so forgotten links cannot resurface later.'],
    ['Sharing with multiple recipients', 'Rooms let several people receive the same file from one sender. Set a download cap to control exactly how many copies go out.'],
    ['Verifying you sent the right thing', 'Always confirm the filename and size on the receiving end. A quick check prevents the embarrassment — or risk — of sending the wrong document.'],
    ['Cross-device transfers', 'Moving a file from phone to laptop should not require the cloud. A direct transfer in the browser works across devices and operating systems with no app to install.'],
  ],
  'WebRTC & P2P': [
    ['How WebRTC establishes a connection', 'WebRTC uses a signaling step to exchange connection details, then ICE to find a viable network path between peers, often with the help of STUN servers. Once a path is found, media and data flow directly between the two browsers.'],
    ['STUN, TURN, and NAT traversal', 'Most devices sit behind NAT. STUN helps a peer discover its public address; when a direct path is impossible, a TURN server relays traffic as a fallback. Good tools try direct first and only relay when necessary.'],
    ['DataChannels for file transfer', 'WebRTC DataChannels provide reliable, ordered, encrypted delivery similar to TCP, which is exactly what file transfer needs. Files are chunked, sent, and reassembled on the other side.'],
    ['Why DTLS encryption is mandatory', 'Every WebRTC connection is encrypted with DTLS by default — it is not optional. That baseline means peer-to-peer transfers are private in transit without any extra configuration.'],
    ['Chunking and backpressure', 'Sending a large file means breaking it into chunks and respecting the channel’s buffer so you do not overwhelm the receiver. Acknowledgements let the sender pace delivery and track progress accurately.'],
    ['Resuming interrupted transfers', 'Networks drop. Persisting the last acknowledged offset lets a reconnecting peer resume from where it left off instead of starting over.'],
  ],
  'Productivity': [
    ['Reducing friction in everyday tasks', 'The fastest tool is the one that needs no setup. Removing sign-ups, installs, and configuration screens turns a multi-minute chore into a few seconds of actual work.'],
    ['Keyboard-first workflows', 'Learning a handful of shortcuts compounds over time. Tools that expose their core actions to the keyboard let you stay in flow without reaching for the mouse.'],
    ['Batching similar work', 'Context switching is expensive. Grouping similar tasks — answering messages, sharing files, reviewing docs — preserves focus and reduces the mental cost of switching.'],
    ['Defaults that respect your time', 'Sensible defaults mean you rarely have to think. A tool that does the right thing out of the box saves more time than one with endless options.'],
    ['Cutting the cloud round-trip', 'Uploading then downloading wastes time and bandwidth. Direct transfers skip the round-trip, which matters most when files are large or connections are slow.'],
    ['Automating the repetitive', 'Anything you do the same way twice is a candidate for a shortcut, template, or script. Small automations free attention for work that actually needs it.'],
  ],
  'Web Development': [
    ['Server Components and the modern stack', 'React Server Components render on the server and ship less JavaScript to the browser, improving load times. Pairing them with client components only where interactivity is needed keeps apps fast.'],
    ['Streaming and progressive rendering', 'Streaming HTML lets the browser paint meaningful content before the whole page is ready. Users perceive a faster site even when total work is unchanged.'],
    ['Designing accessible components', 'Accessibility is not a feature bolted on at the end. Semantic markup, focus management, and ARIA where needed make interfaces usable by everyone and tend to improve the experience for all users.'],
    ['Theming with CSS variables', 'CSS custom properties make light/dark modes and runtime theming cheap. Driving a design system from variables means a single change cascades everywhere.'],
    ['Edge and serverless tradeoffs', 'Running code at the edge cuts latency but constrains runtime APIs. Knowing what each environment supports prevents surprises in production.'],
    ['Type safety end to end', 'Sharing types between client and server catches whole classes of bugs at compile time. Schema validation at the boundary turns untrusted input into typed, safe data.'],
  ],
  'Tutorials & How-To': [
    ['Getting set up', 'Start with the minimum: open the tool, confirm it loads, and try the smallest possible action. A quick win builds confidence before you tackle the full workflow.'],
    ['Step-by-step walkthrough', 'Break the task into discrete, verifiable steps. After each step, confirm the expected result before moving on so you can pinpoint exactly where anything goes wrong.'],
    ['Common pitfalls and fixes', 'Most issues come from a handful of predictable mistakes — wrong settings, blocked permissions, or a flaky network. Knowing the usual suspects makes troubleshooting fast.'],
    ['Tips to go faster', 'Once the basics click, small optimizations add up: shortcuts, templates, and sensible defaults turn a deliberate process into second nature.'],
    ['Verifying the result', 'Always confirm the outcome end to end. A final check ensures the task actually succeeded rather than merely appearing to.'],
    ['Where to go next', 'With the fundamentals in place, explore advanced options incrementally. Add one new technique at a time so you always understand what changed.'],
  ],
  'Tools & Tips': [
    ['Pick tools that do one thing well', 'Focused tools are easier to learn and harder to misuse. A utility that solves a single problem cleanly usually beats a bloated suite that does everything adequately.'],
    ['Privacy-respecting alternatives', 'For many popular services there is a lighter, more private alternative. Choosing tools that minimize data collection reduces your exposure with little downside.'],
    ['Browser-based beats install-required', 'Web tools work everywhere, need no admin rights, and update automatically. For occasional tasks they are often the most convenient option.'],
    ['Keyboard shortcuts worth learning', 'A small investment in shortcuts pays back daily. Start with copy, paste, search, and undo, then add the few specific to your most-used tools.'],
    ['Know your tool’s limits', 'Every tool has edge cases. Understanding where one breaks down tells you when to reach for something else.'],
    ['Free does not mean worse', 'Plenty of free, open tools outperform paid ones. Evaluate on fit and trust, not price alone.'],
  ],
  'Data & Backup': [
    ['The 3-2-1 backup rule', 'Keep three copies of important data, on two different media, with one off-site. It is simple, durable, and protects against the most common failure modes.'],
    ['Backups vs. sync', 'Sync mirrors changes everywhere — including deletions and corruption. A true backup keeps point-in-time copies you can restore from. You usually want both.'],
    ['Testing your restores', 'A backup you have never restored is a hope, not a plan. Periodically verify you can actually recover the data.'],
    ['Encrypting backups', 'Backups concentrate your most valuable data in one place, which makes them a target. Encrypt them so a lost drive or breached account does not become a leak.'],
    ['Transferring archives safely', 'When moving large archives between machines, a direct encrypted transfer avoids leaving copies on intermediate servers.'],
    ['Retention and pruning', 'More history is not always better. A sensible retention policy balances recoverability against storage cost and exposure.'],
  ],
  'Networking': [
    ['Understanding NAT', 'Network Address Translation lets many devices share one public IP. It is great for conserving addresses but complicates direct connections, which is why peer-to-peer tools work hard to traverse it.'],
    ['Bandwidth vs. latency', 'Bandwidth is how much data fits through the pipe; latency is how long each bit takes to arrive. Both shape real-world transfer speed, and they are not the same thing.'],
    ['Firewalls and corporate networks', 'Strict networks sometimes block the ports peer-to-peer connections need. A relay fallback keeps transfers working even in locked-down environments.'],
    ['Why direct paths are faster', 'A direct connection between two peers avoids the extra hops of routing through a central server, which usually means lower latency and higher throughput.'],
    ['Diagnosing a stuck connection', 'When a transfer will not start, suspect NAT, a firewall, or a peer that went offline. Systematically ruling these out finds the cause quickly.'],
    ['IPv6 and the future', 'Wider IPv6 adoption reduces the need for NAT traversal, gradually making direct peer connections simpler to establish.'],
  ],
  'Career & Remote Work': [
    ['Sharing work securely with clients', 'Freelancers and remote teams move sensitive files constantly. Choosing private, ephemeral transfers protects client confidentiality and your reputation.'],
    ['Async collaboration done right', 'Remote work thrives on clear, self-contained updates. Sharing deliverables with a simple link — no account required for the recipient — removes friction from collaboration.'],
    ['Protecting client confidentiality', 'Handling someone else’s data raises the stakes. Minimize where it is stored, encrypt in transit, and delete what you no longer need.'],
    ['Tools for the distributed team', 'A distributed team’s toolkit should favor things that work anywhere, need no install, and respect privacy across borders and devices.'],
    ['Building trust at a distance', 'Reliability and discretion build trust when you cannot meet in person. Using professional, secure tools signals that you take the work seriously.'],
    ['Avoiding tool sprawl', 'Every new app is another login and another place data lives. Consolidating around a few trusted tools reduces risk and cognitive load.'],
  ],
}

// ── Titles per category (specific, search-friendly) ─────────────────────────
const TITLES = {
  'Privacy & Security': [
    'What End-to-End Encryption Really Means for Your Files',
    'How to Send Sensitive Documents Without the Cloud',
    'A Practical Guide to Threat Modeling Your File Transfers',
    'Why Peer-to-Peer Sharing Is More Private Than Cloud Links',
    'Password-Protecting a File Transfer: When and How',
    'The Hidden Privacy Cost of Free File-Sharing Services',
    'Zero-Knowledge Explained for Non-Engineers',
    'Metadata Leaks: What Your Files Reveal About You',
    'How to Share Files With Journalists and Sources Safely',
    'Encryption in Transit vs. At Rest: What You Actually Need',
    'A Privacy Checklist for Sharing Files at Work',
    'Why You Should Stop Emailing Confidential Attachments',
    'Protecting Personal Data When Sharing With Strangers',
    'Secure File Sharing for Healthcare and Legal Work',
  ],
  'File Sharing': [
    'The Fastest Way to Send a Large File in 2026',
    'How to Send Files Too Big for Email',
    'Sharing Files Between Phone and Laptop Without the Cloud',
    'One Link, Many Recipients: How File Rooms Work',
    'Ephemeral vs. Persistent File Links: Which to Use',
    'How to Send a Folder of Files at Once',
    'Sending Video Files Without Compression Headaches',
    'The Best Way to Share Files With Someone Who Has No Account',
    'How Download Limits Keep Your Shares Under Control',
    'Sharing Files Across Operating Systems, Friction-Free',
    'Why "Upload Then Share" Is the Slow Way to Send Files',
    'How to Send High-Resolution Photos Without Quality Loss',
    'Transferring Files on a Slow or Flaky Connection',
    'A Beginner’s Guide to Peer-to-Peer File Sharing',
  ],
  'WebRTC & P2P': [
    'How WebRTC Powers Browser-to-Browser File Transfer',
    'STUN and TURN Servers Explained Simply',
    'What Are WebRTC DataChannels and Why They Matter',
    'NAT Traversal: How Peers Find Each Other',
    'Why WebRTC Connections Are Encrypted by Default',
    'Chunking Large Files for Reliable P2P Transfer',
    'How Resumable Transfers Survive a Dropped Connection',
    'Signaling in WebRTC: The Handshake Before the Transfer',
    'Peer-to-Peer vs. Client-Server: A Practical Comparison',
    'Building Intuition for ICE Candidates',
    'How Browsers Move Gigabytes Without a Server in the Middle',
    'The Role of Backpressure in Smooth File Transfers',
    'Why Some P2P Connections Fail (and How to Fix Them)',
    'A Gentle Introduction to Real-Time Web Protocols',
  ],
  'Productivity': [
    'Cut the Cloud Round-Trip and Save Minutes Every Day',
    'Setup-Free Tools That Respect Your Time',
    'How Sensible Defaults Make You Faster',
    'The Case for Keyboard-First Workflows',
    'Batching: The Underrated Productivity Multiplier',
    'Small Automations That Add Up to Big Time Savings',
    'Why Fewer Tools Often Means More Output',
    'Designing a Distraction-Free Sharing Workflow',
    'The Two-Minute Rule for File Management',
    'How to Stop Losing Files in Endless Folders',
    'Streamlining Handoffs Between Teammates',
    'Focus-Friendly Habits for Knowledge Workers',
    'Reducing the Friction of Everyday Digital Tasks',
    'Templates and Shortcuts Worth Setting Up Once',
  ],
  'Web Development': [
    'React Server Components in Plain English',
    'Streaming HTML for a Faster-Feeling App',
    'Building Accessible Components From the Start',
    'Theming a Web App With CSS Variables',
    'Edge vs. Serverless: Choosing Where Code Runs',
    'End-to-End Type Safety With TypeScript and Zod',
    'How to Ship Less JavaScript to the Browser',
    'Designing a Settings Panel Users Actually Use',
    'Progressive Enhancement Is Not Dead',
    'A Practical Guide to Web App Performance Budgets',
    'Handling File Uploads the Right Way',
    'Server-Sent Events vs. WebSockets for Live Updates',
    'Structuring a Next.js App for Scale',
    'Why Your App Feels Slow (and How to Profile It)',
  ],
  'Tutorials & How-To': [
    'How to Send Your First File With Zync',
    'How to Password-Protect a File Transfer',
    'How to Receive a File From Someone Else',
    'How to Share a File Using a QR Code',
    'How to Send Files to Multiple People at Once',
    'How to Resume an Interrupted Download',
    'How to Move Files Between Your Phone and Computer',
    'How to Stop a Transfer Mid-Way',
    'How to Share Large Video Files Step by Step',
    'How to Set a Download Limit on a Shared File',
    'How to Verify You Received the Right File',
    'How to Share Files on a Restrictive Network',
    'How to Send a Folder Instead of a Single File',
    'How to Personalize Your Sharing Experience',
  ],
  'Tools & Tips': [
    'Browser-Based Tools That Beat Installed Apps',
    'Privacy-Respecting Alternatives to Popular Services',
    'Ten Keyboard Shortcuts Worth Memorizing',
    'How to Choose a File-Sharing Tool You Can Trust',
    'Single-Purpose Tools vs. All-in-One Suites',
    'Free Tools That Outperform Paid Ones',
    'Know the Limits of Your Favorite Apps',
    'The Minimalist’s Toolkit for Sharing Files',
    'How to Audit the Tools You Already Use',
    'When to Reach for a Different Tool',
    'Lightweight Utilities Every Remote Worker Needs',
    'How to Spot a Trustworthy Web App',
    'Cutting Down on App Sprawl',
    'Underrated Browser Features You Should Use',
  ],
  'Data & Backup': [
    'The 3-2-1 Backup Rule, Explained',
    'Backups vs. Sync: Know the Difference',
    'How to Test That Your Backups Actually Work',
    'Why You Should Encrypt Every Backup',
    'Safely Transferring Large Archives Between Machines',
    'Choosing a Retention Policy That Makes Sense',
    'Protecting Yourself From Ransomware With Good Backups',
    'How to Move Your Data to a New Computer',
    'Cold Storage vs. Hot Storage for Personal Files',
    'A Simple Backup Routine You’ll Actually Follow',
    'Avoiding the Most Common Backup Mistakes',
    'How Long Should You Keep Old Files?',
    'Migrating Data Without Leaving Copies Behind',
    'Disaster Recovery Basics for Individuals',
  ],
  'Networking': [
    'NAT Explained: Why Direct Connections Are Tricky',
    'Bandwidth vs. Latency: What Actually Affects Speed',
    'How Firewalls Affect File Transfers',
    'Why Direct Paths Beat Routing Through a Server',
    'How to Diagnose a Stuck Peer-to-Peer Connection',
    'IPv6 and the Future of Direct Connections',
    'Understanding Your Home Network for Faster Transfers',
    'What a VPN Does (and Doesn’t) for File Sharing',
    'Ports, Protocols, and Why Some Transfers Fail',
    'How CDNs and Relays Fit Into the Picture',
    'Measuring Your Real Upload Speed',
    'Why Corporate Wi-Fi Blocks Some Connections',
    'The Basics of How Data Travels Across the Internet',
    'Troubleshooting Slow Transfers Step by Step',
  ],
  'Career & Remote Work': [
    'Sharing Deliverables Securely With Clients',
    'A File-Sharing Workflow for Freelancers',
    'Protecting Client Confidentiality as a Remote Worker',
    'The Distributed Team’s Lightweight Toolkit',
    'Building Trust With Clients You Never Meet',
    'How to Avoid Tool Sprawl on a Remote Team',
    'Async Handoffs That Don’t Slow Everyone Down',
    'Sending Large Design Files to Clients',
    'Onboarding Contractors Without Sharing Too Much',
    'Professional Habits That Signal Reliability',
    'Keeping Work Data Off Personal Cloud Accounts',
    'Sharing Files Across Time Zones',
    'A Security Baseline for Solo Consultants',
    'Collaborating With Clients Who Aren’t Technical',
  ],
}

// ── Helpers ─────────────────────────────────────────────────────────────────
function slugify(s) {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
}

function seeded(n) {
  // deterministic pseudo-random for stable output
  let x = Math.sin(n) * 10000
  return x - Math.floor(x)
}

function pickSections(bank, seed, count) {
  const idx = bank.map((_, i) => i)
  // rotate + shuffle deterministically
  idx.sort((a, b) => seeded(seed + a) - seeded(seed + b))
  return idx.slice(0, count).map((i) => bank[i])
}

function excerptFor(title, category) {
  return `${title} — a practical, ${category.toLowerCase()} guide from ${BRAND} on sharing files privately and efficiently.`
}

function buildBody(title, category, seed) {
  const bank = BANK[category]
  const sections = pickSections(bank, seed, 4)

  const intro = `When it comes to **${title.replace(/^How to /, '').replace(/[?:]/g, '')}**, the details matter more than most people assume. In this guide we break down what actually works, why it works, and how to apply it without overthinking it. Whether you are sharing a single document or moving gigabytes between devices, the principles below will help you do it faster and more privately.`

  const body = sections
    .map(([heading, para]) => `## ${heading}\n\n${para}`)
    .join('\n\n')

  const zync = `## Where ${BRAND} fits in\n\n${BRAND} is a free, peer-to-peer file transfer tool that puts these ideas into practice. Files stream directly between browsers over an encrypted WebRTC connection — they are never uploaded to or stored on a server. There is no account to create and no size cap to fight. When you close the tab, the transfer is gone. It is the simplest way to apply everything in this article today.`

  const takeaways = `## Key takeaways\n\n- ${sections
    .map(([h]) => h.replace(/^(Why|How|The) /, ''))
    .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
    .join('\n- ')}\n- Prefer tools that minimize stored copies of your data.\n- Encryption in transit should be the default, not an add-on.`

  const faq = `## Frequently asked questions\n\n**Is peer-to-peer file sharing safe?**\n\nYes — when transfers are encrypted end to end (as WebRTC connections are by default), the data is protected in transit and never stored on a third-party server.\n\n**Do I need an account to use ${BRAND}?**\n\nNo. ${BRAND} requires no sign-up to send or receive files. Accounts are optional and only used for profile features.\n\n**What happens to my file after the transfer?**\n\nNothing is retained. Because the file is never uploaded to a server, there is no copy left behind once the transfer completes or the tab closes.`

  const conclusion = `## Conclusion\n\n${title.replace(/[?:]/g, '')} does not have to be complicated. Choose tools that respect your privacy, keep copies to a minimum, and lean on encryption by default. Ready to try it? [Send a file with ${BRAND}](/send) — no account, no install, no catch.`

  return `${intro}\n\n${body}\n\n${zync}\n\n${takeaways}\n\n${faq}\n\n${conclusion}\n`
}

// ── Generate ────────────────────────────────────────────────────────────────
fs.mkdirSync(OUT, { recursive: true })
// Clean previous generated files
for (const f of fs.readdirSync(OUT)) {
  if (f.endsWith('.md')) fs.unlinkSync(path.join(OUT, f))
}

let count = 0
let day = 0
const start = new Date('2026-06-15T00:00:00Z')

for (const [category, titles] of Object.entries(TITLES)) {
  titles.forEach((title, i) => {
    const slug = slugify(title)
    const seed = count + 1
    const date = new Date(start.getTime() - day * 86400000)
    day += 1
    const tags = [category, 'file sharing', 'privacy', BRAND].filter(
      (t, idx, a) => a.indexOf(t) === idx,
    )
    const body = buildBody(title, category, seed)
    const frontmatter = [
      '---',
      `title: ${JSON.stringify(title)}`,
      `slug: ${slug}`,
      `date: ${date.toISOString().slice(0, 10)}`,
      `category: ${JSON.stringify(category)}`,
      `excerpt: ${JSON.stringify(excerptFor(title, category))}`,
      `tags: [${tags.map((t) => JSON.stringify(t)).join(', ')}]`,
      `author: ${JSON.stringify(AUTHOR)}`,
      '---',
      '',
    ].join('\n')
    fs.writeFileSync(path.join(OUT, `${slug}.md`), frontmatter + body)
    count += 1
  })
}

console.log(`Generated ${count} blog posts into ${OUT}`)
