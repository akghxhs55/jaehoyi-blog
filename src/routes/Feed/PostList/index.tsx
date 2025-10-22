import PostCard from "src/routes/Feed/PostList/PostCard"
import { TPost } from "src/types"

type Props = {
  posts: TPost[]
  q: string
}

const PostList: React.FC<Props> = ({ posts, q }) => {
  return (
    <>
      <div className="my-2">
        {!posts.length && (
          <p className="text-gray-500 dark:text-gray-300">Nothing! 😺</p>
        )}
        {posts.map((post) => (
          <PostCard key={post.id} data={post} />
        ))}
      </div>
    </>
  );
}

export default PostList
