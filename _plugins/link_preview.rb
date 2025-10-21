# _plugins/link_preview.rb
require 'nokogiri'
require 'open-uri'
require 'json'
require 'fileutils'
require 'digest'

module Jekyll
  module LinkPreview
    class Generator < Jekyll::Generator
      safe true
      priority :low

      def generate(site)
        @site = site
        @cache_dir = File.join(site.source, '_cache', 'link_preview')
        FileUtils.mkdir_p(@cache_dir)

        site.posts.docs.each do |post|
          post.content = process_content(post.content)
        end

        site.pages.each do |page|
          if page.name.end_with?('.md', '.markdown', '.html')
            page.content = process_content(page.content)
          end
        end
      end

      private

      def process_content(content)
        # HTML로 변환된 content를 파싱
        doc = Nokogiri::HTML::DocumentFragment.parse(content)
        
        # 모든 p 태그 찾기
        doc.css('p').each do |paragraph|
          links = paragraph.css('a[href]')
          next if links.empty?

          # 외부 링크만 필터링
          external_links = links.select do |link|
            href = link['href']
            href && href.start_with?('http://', 'https://') && !href.include?(@site.config['url'] || '')
          end

          next if external_links.empty?

          # OG 데이터 수집
          links_data = external_links.map do |link|
            fetch_og_data(link['href'])
          end.compact

          next if links_data.empty?

          # 링크 프리뷰 트리거 버튼 생성
          trigger = create_trigger_element(links_data)
          paragraph.add_child(trigger)
        end

        doc.to_html
      end

      def fetch_og_data(url)
        return nil unless url

        # 캐시 체크
        cache_key = Digest::MD5.hexdigest(url)
        cache_file = File.join(@cache_dir, "#{cache_key}.json")

        if File.exist?(cache_file)
          cache_data = JSON.parse(File.read(cache_file))
          # 7일 캐시
          if Time.now.to_i - cache_data['timestamp'] < 7 * 24 * 60 * 60
            return cache_data['data']
          end
        end

        # OG 데이터 가져오기
        og_data = scrape_og_data(url)
        
        # 캐시 저장
        File.write(cache_file, JSON.encode({
          'data' => og_data,
          'timestamp' => Time.now.to_i
        }))

        og_data
      rescue => e
        Jekyll.logger.warn "LinkPreview:", "Failed to fetch OG data for #{url}: #{e.message}"
        nil
      end

      def scrape_og_data(url)
        # User-Agent 설정
        html = URI.open(url, 
          'User-Agent' => 'Mozilla/5.0 (compatible; Jekyll LinkPreview/1.0)',
          read_timeout: 5
        ).read

        doc = Nokogiri::HTML(html)
        
        {
          'url' => url,
          'title' => get_meta_content(doc, 'og:title') || doc.at_css('title')&.text || url,
          'description' => get_meta_content(doc, 'og:description') || get_meta_content(doc, 'description') || '',
          'image' => get_meta_content(doc, 'og:image') || '',
          'domain' => URI.parse(url).host
        }
      rescue => e
        Jekyll.logger.warn "LinkPreview:", "Error scraping #{url}: #{e.message}"
        {
          'url' => url,
          'title' => url,
          'description' => '',
          'image' => '',
          'domain' => URI.parse(url).host rescue url
        }
      end

      def get_meta_content(doc, property)
        meta = doc.at_css("meta[property='#{property}']") || 
               doc.at_css("meta[name='#{property}']")
        meta&.[]('content')
      end

      def create_trigger_element(links_data)
        data_json = JSON.generate(links_data).gsub("'", '&#39;')
        
        Nokogiri::HTML::DocumentFragment.parse(<<~HTML)
          <span class="link-preview-trigger" data-links='#{data_json}'>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>
              <polyline points="15 3 21 3 21 9"/>
              <line x1="10" y1="14" x2="21" y2="3"/>
            </svg>
            <span class="link-count">#{links_data.length}</span>
          </span>
        HTML
      end
    end
  end
end