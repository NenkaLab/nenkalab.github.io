# _plugins/link_preview.rb
require 'nokogiri'
require 'open-uri'
require 'json'
require 'fileutils'
require 'digest'
require 'base64'

module Jekyll
  module LinkPreview
    class << self
      attr_accessor :cache_dir, :site_url
    end

    Jekyll::Hooks.register :site, :after_init do |site|
      LinkPreview.cache_dir = File.join(site.source, '_cache', 'link_preview')
      LinkPreview.site_url = site.config['url'] || ''
      FileUtils.mkdir_p(LinkPreview.cache_dir)
    end

    Jekyll::Hooks.register :posts, :post_render do |post|
      post.output = process_html(post.output)
    end

    Jekyll::Hooks.register :pages, :post_render do |page|
      if page.output_ext == '.html'
        page.output = process_html(page.output)
      end
    end

    def self.process_html(html)
      doc = Nokogiri::HTML(html)
      content_area = doc.at_css('.post.prose') || doc.at_css('article') || doc.at_css('body')
      return html unless content_area
      
      content_area.css('p').each do |paragraph|
        process_paragraph(paragraph)
      end

      doc.to_html
    end

    def self.process_paragraph(paragraph)
      links = paragraph.css('a[href]')
      return if links.empty?

      external_links = links.select do |link|
        href = link['href']
        href && 
        href.start_with?('http://', 'https://') && 
        !href.include?(LinkPreview.site_url)
      end

      return if external_links.empty?

      links_data = external_links.map do |link|
        fetch_og_data(link['href'])
      end.compact

      return if links_data.empty?

      trigger = create_trigger_element(links_data)
      paragraph.add_child(trigger)
    end

    def self.fetch_og_data(url)
      return nil unless url

      cache_key = Digest::MD5.hexdigest(url)
      cache_file = File.join(LinkPreview.cache_dir, "#{cache_key}.json")

      if File.exist?(cache_file)
        cache_data = JSON.parse(File.read(cache_file))
        if Time.now.to_i - cache_data['timestamp'] < 7 * 24 * 60 * 60
          return cache_data['data']
        end
      end

      og_data = scrape_og_data(url)
      
      File.write(cache_file, JSON.generate({
        'data' => og_data,
        'timestamp' => Time.now.to_i
      }))

      og_data
    rescue => e
      Jekyll.logger.warn "LinkPreview:", "Failed to fetch OG data for #{url}: #{e.message}"
      nil
    end

    def self.scrape_og_data(url)
      html = URI.open(url, 
        'User-Agent' => 'Mozilla/5.0 (compatible; Jekyll LinkPreview/1.0)',
        read_timeout: 5
      ).read

      doc = Nokogiri::HTML(html)
      
      domain = begin
        URI.parse(url).host
      rescue
        url
      end
      
      {
        'url' => url,
        'title' => get_meta_content(doc, 'og:title') || doc.at_css('title')&.text || url,
        'description' => get_meta_content(doc, 'og:description') || get_meta_content(doc, 'description') || '',
        'image' => get_meta_content(doc, 'og:image') || '',
        'domain' => domain
      }
    rescue => e
      Jekyll.logger.warn "LinkPreview:", "Error scraping #{url}: #{e.message}"
      
      domain = begin
        URI.parse(url).host
      rescue
        url
      end
      
      {
        'url' => url,
        'title' => url,
        'description' => '',
        'image' => '',
        'domain' => domain
      }
    end

    def self.get_meta_content(doc, property)
      meta = doc.at_css("meta[property='#{property}']") || 
             doc.at_css("meta[name='#{property}']")
      meta&.[]('content')
    end

    def self.create_trigger_element(links_data)
      # JSON을 Base64로 인코딩 (특수문자, UTF-8 안전 처리)
      json_string = JSON.generate(links_data)
      encoded_data = Base64.strict_encode64(json_string)
      
      Nokogiri::HTML::DocumentFragment.parse(<<~HTML)
        <span class="link-preview-trigger" style="display: none;" data-links="#{encoded_data}" data-count="#{links_data.length}">
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