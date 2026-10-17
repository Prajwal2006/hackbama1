import type {
  CommunityPost,
  CycleView,
  PaymentMethod,
  PostData,
  PostKind,
  PostView,
  SwapRequest,
  SwapView,
} from "./community-types";
import type { Actor, Result } from "./repository";

export type NewPostInput = {
  kind: PostKind;
  title: string;
  body: string;
  capacity: number;
  unitPriceCents: number;
  startsAt: Date;
  imageUrl: string | null;
  data: PostData;
};

/** Student community modules: subscription splits, rides & trips, meal share, class swaps. */
export interface CommunityRepository {
  listPosts(campusId: string, kind: PostKind): Promise<PostView[]>;
  getPost(id: string): Promise<PostView | null>;
  createPost(actor: Actor, input: NewPostInput): Promise<Result<CommunityPost>>;
  joinPost(actor: Actor, postId: string, quantity: number): Promise<Result<PostView>>;
  leavePost(actor: Actor, postId: string): Promise<Result<PostView>>;
  /** Member marks "sent"; post owner marks "received". */
  ackMember(actor: Actor, memberId: string, what: "sent" | "received", method: PaymentMethod | null): Promise<Result<PostView>>;
  closePost(actor: Actor, postId: string): Promise<Result<PostView>>;

  listSwaps(campusId: string): Promise<SwapView[]>;
  mySwaps(actor: Actor): Promise<{ requests: SwapView[]; cycles: CycleView[] }>;
  /** Creates the request and immediately tries to form a swap cycle. */
  createSwap(actor: Actor, input: { course: string; haveSection: string; wantSection: string; autoAccept: boolean }): Promise<Result<{ request: SwapRequest; cycle: CycleView | null }>>;
  confirmCycle(actor: Actor, cycleId: string): Promise<Result<CycleView>>;
  cancelSwap(actor: Actor, requestId: string): Promise<Result<void>>;
}
