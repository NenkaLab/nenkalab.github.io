# _plugins/last_modified.rb

module Jekyll
  class LastModified < Generator
    priority :highest
    
    def generate(site)
      site.posts.docs.each do |post|
        # front matter에 이미 있으면 건너뛰기
        next if post.data['last_modified_at']
        
        # 파일 시스템의 수정 시간 가져오기
        post.data['last_modified_at'] = File.mtime(post.path)
      end
      
      site.utils.docs.each do |util|
        # front matter에 이미 있으면 건너뛰기
        next if util.data['last_modified_at']
        
        # 파일 시스템의 수정 시간 가져오기
        util.data['last_modified_at'] = File.mtime(util.path)
      end
    end
  end
end